"""
Calificación y validación en tiempo real para evaluaciones Canvas.
"""
from __future__ import annotations

from typing import Any


def _norm_key(value: Any) -> str:
    return str(value).strip().lower() if value is not None else ""


def _get_respuesta(respuestas: dict, pregunta_id: int):
    return respuestas.get(str(pregunta_id), respuestas.get(pregunta_id))


def _get_canvas_item(canvas_payload: dict, pregunta_id: int) -> dict:
    if not isinstance(canvas_payload, dict):
        return {}
    raw = canvas_payload.get(str(pregunta_id), canvas_payload.get(pregunta_id))
    return raw if isinstance(raw, dict) else {}


def validar_pregunta(
    pregunta, respuesta: Any = None, canvas_item: dict | None = None
) -> dict:
    """
    Valida una respuesta (tiempo real o envío final).
    No revela la respuesta_correcta completa.
    """
    canvas_item = canvas_item or {}
    correcta = pregunta.respuesta_correcta or {}
    config = pregunta.canvas_config or {}
    ok = False
    detalle: dict[str, Any] = {"tipo": pregunta.tipo}

    if pregunta.tipo == pregunta.Tipo.OPCION_MULTIPLE:
        esperado = correcta.get("valor", correcta)
        ok = _norm_key(respuesta) == _norm_key(esperado)
        detalle["seleccion"] = respuesta

    elif pregunta.tipo == pregunta.Tipo.VERDADERO_FALSO:
        esperado = correcta.get("valor", correcta)
        ok = bool(respuesta) is bool(esperado) or _norm_key(respuesta) == _norm_key(
            esperado
        )
        detalle["seleccion"] = respuesta

    elif pregunta.tipo == pregunta.Tipo.CANVAS_HOTSPOT:
        # Selección en lienzo: hotspot_id o click (x,y) dentro del radio
        expected_id = correcta.get("hotspot_id")
        got_id = canvas_item.get("hotspot_id") or (
            respuesta.get("hotspot_id") if isinstance(respuesta, dict) else respuesta
        )
        if got_id is not None and expected_id is not None:
            ok = str(got_id) == str(expected_id)
            detalle["hotspot_id"] = got_id
        else:
            # Validación por coordenadas (selección en tiempo real)
            x = canvas_item.get("x", (respuesta or {}).get("x") if isinstance(respuesta, dict) else None)
            y = canvas_item.get("y", (respuesta or {}).get("y") if isinstance(respuesta, dict) else None)
            hotspots = config.get("hotspots") or []
            target = next((h for h in hotspots if str(h.get("id")) == str(expected_id)), None)
            if target and x is not None and y is not None:
                dx = float(x) - float(target["x"])
                dy = float(y) - float(target["y"])
                r = float(target.get("r", 30))
                ok = (dx * dx + dy * dy) <= (r * r)
                detalle["punto"] = {"x": x, "y": y}
            else:
                ok = False

    elif pregunta.tipo == pregunta.Tipo.CANVAS_ARRASTRAR:
        # Arrastrar: asignaciones item_id -> target_id
        esperados = correcta.get("asignaciones") or correcta.get("pares") or {}
        if isinstance(esperados, list):
            esperados = {
                str(p.get("item_id") or p.get("item")): str(
                    p.get("target_id") or p.get("target")
                )
                for p in esperados
            }
        else:
            esperados = {str(k): str(v) for k, v in esperados.items()}

        obtenidos = canvas_item.get("asignaciones") or (
            respuesta.get("asignaciones") if isinstance(respuesta, dict) else respuesta
        )
        if isinstance(obtenidos, list):
            obtenidos = {
                str(p.get("item_id") or p.get("item")): str(
                    p.get("target_id") or p.get("target")
                )
                for p in obtenidos
            }
        elif isinstance(obtenidos, dict):
            obtenidos = {str(k): str(v) for k, v in obtenidos.items()}
        else:
            obtenidos = {}

        if not esperados:
            ok = False
        else:
            ok = all(obtenidos.get(k) == v for k, v in esperados.items())
            # parcial: cuántos pares correctos
            aciertos = sum(1 for k, v in esperados.items() if obtenidos.get(k) == v)
            detalle["pares_correctos"] = aciertos
            detalle["pares_totales"] = len(esperados)
            detalle["completo"] = ok

    elif pregunta.tipo == pregunta.Tipo.CANVAS_DIBUJO:
        # Región objetivo: el trazo/centro debe caer en zona
        expected_region = correcta.get("region_id")
        got_region = canvas_item.get("region_id") or (
            respuesta.get("region_id") if isinstance(respuesta, dict) else None
        )
        if got_region is not None and expected_region is not None:
            ok = str(got_region) == str(expected_region)
            detalle["region_id"] = got_region
        else:
            cx = canvas_item.get("cx", (respuesta or {}).get("cx") if isinstance(respuesta, dict) else None)
            cy = canvas_item.get("cy", (respuesta or {}).get("cy") if isinstance(respuesta, dict) else None)
            regions = config.get("regiones") or []
            target = next(
                (r for r in regions if str(r.get("id")) == str(expected_region)), None
            )
            if target and cx is not None and cy is not None:
                # rectángulo x,y,w,h o círculo x,y,r
                if "w" in target:
                    ok = (
                        float(target["x"])
                        <= float(cx)
                        <= float(target["x"]) + float(target["w"])
                        and float(target["y"])
                        <= float(cy)
                        <= float(target["y"]) + float(target["h"])
                    )
                else:
                    dx = float(cx) - float(target["x"])
                    dy = float(cy) - float(target["y"])
                    r = float(target.get("r", 40))
                    ok = (dx * dx + dy * dy) <= (r * r)
                detalle["centro"] = {"cx": cx, "cy": cy}
            else:
                ok = False
    else:
        ok = respuesta == correcta

    feedback = (
        config.get("feedback_ok")
        if ok
        else config.get("feedback_fail", "Respuesta incorrecta. Intenta de nuevo.")
    )
    if ok and not feedback:
        feedback = "¡Correcto!"

    return {
        "pregunta_id": pregunta.id,
        "correcta": ok,
        "feedback": feedback,
        "puntaje": pregunta.puntaje if ok else 0,
        "puntaje_max": pregunta.puntaje,
        "detalle": detalle,
    }


def calificar_intento(evaluacion, respuestas: dict, canvas_payload: dict) -> dict:
    """
    Califica todas las preguntas y arma el resumen del intento.

    Las preguntas 'canvas_dibujo' (trazo libre) no tienen forma automática de
    validarse contra una región — se excluyen del cálculo de % y quedan como
    puntos_pendientes hasta que un instructor las califique manualmente
    (ver InstructorIntentoViewSet.calificar).
    """
    detalle = []
    total = 0
    obtenidos = 0
    pendiente_max = 0
    for pregunta in evaluacion.preguntas.all():
        resp = _get_respuesta(respuestas, pregunta.id)
        canvas_item = _get_canvas_item(canvas_payload, pregunta.id)
        resultado = validar_pregunta(pregunta, resp, canvas_item)
        detalle.append(resultado)
        if pregunta.tipo == pregunta.Tipo.CANVAS_DIBUJO:
            pendiente_max += pregunta.puntaje
            continue
        total += pregunta.puntaje
        obtenidos += resultado["puntaje"]

    pct = round((obtenidos / total * 100) if total else 0, 2)
    return {
        "detalle_calificacion": detalle,
        "puntaje": pct,
        "aprobado": pct >= evaluacion.puntaje_aprobacion and pendiente_max == 0,
        "puntos_obtenidos": obtenidos,
        "puntos_totales": total + pendiente_max,
        "puntos_pendientes": pendiente_max,
    }
