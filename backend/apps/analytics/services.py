"""
Agregación de métricas para el dashboard de progreso.
"""
from __future__ import annotations

from django.db.models import Avg, Count, Q, Sum

from apps.cursos.models import Inscripcion, Leccion
from apps.evaluaciones.models import IntentoEvaluacion
from apps.progreso.models import ProgresoLeccion


def metricas_estudiante(user, curso=None) -> dict:
    """
    % completado, tiempo invertido y desempeño en evaluaciones.
    Si `curso` se indica, acota a ese curso.
    """
    insc_qs = Inscripcion.objects.filter(estudiante=user).select_related("curso")
    if curso is not None:
        insc_qs = insc_qs.filter(curso=curso)

    progresos = ProgresoLeccion.objects.filter(estudiante=user)
    intentos = IntentoEvaluacion.objects.filter(
        estudiante=user, estado=IntentoEvaluacion.Estado.FINALIZADO
    )
    lecciones = Leccion.objects.filter(es_obligatoria=True)

    if curso is not None:
        progresos = progresos.filter(leccion__modulo__curso=curso)
        intentos = intentos.filter(evaluacion__leccion__modulo__curso=curso)
        lecciones = lecciones.filter(modulo__curso=curso)

    total_lecciones = lecciones.count()
    completadas = progresos.filter(
        estado=ProgresoLeccion.Estado.COMPLETADA,
        leccion__es_obligatoria=True,
    ).count()
    en_progreso = progresos.filter(
        estado=ProgresoLeccion.Estado.EN_PROGRESO
    ).count()

    tiempo_agg = progresos.aggregate(total=Sum("tiempo_segundos"))
    tiempo_total = int(tiempo_agg["total"] or 0)

    if curso is not None:
        insc = insc_qs.first()
        pct_completado = float(insc.progreso_pct) if insc else (
            round(completadas / total_lecciones * 100, 2) if total_lecciones else 0.0
        )
    else:
        # Promedio ponderado por cursos activos/completados
        activos = insc_qs.exclude(estado=Inscripcion.Estado.CANCELADA)
        if activos.exists():
            pct_completado = round(
                float(activos.aggregate(a=Avg("progreso_pct"))["a"] or 0), 2
            )
        else:
            pct_completado = (
                round(completadas / total_lecciones * 100, 2) if total_lecciones else 0.0
            )

    intentos_agg = intentos.aggregate(
        total=Count("id"),
        aprobados=Count("id", filter=Q(aprobado=True)),
        promedio=Avg("puntaje"),
    )
    total_intentos = intentos_agg["total"] or 0
    aprobados = intentos_agg["aprobados"] or 0
    promedio_puntaje = round(float(intentos_agg["promedio"] or 0), 2)
    tasa_aprobacion = (
        round(aprobados / total_intentos * 100, 2) if total_intentos else 0.0
    )

    cursos_detalle = []
    for insc in insc_qs.exclude(estado=Inscripcion.Estado.CANCELADA).order_by(
        "-inscrito_en"
    ):
        c = insc.curso
        prog_curso = ProgresoLeccion.objects.filter(
            estudiante=user, leccion__modulo__curso=c
        )
        tiempo_curso = int(
            prog_curso.aggregate(t=Sum("tiempo_segundos"))["t"] or 0
        )
        intentos_curso = IntentoEvaluacion.objects.filter(
            estudiante=user,
            estado=IntentoEvaluacion.Estado.FINALIZADO,
            evaluacion__leccion__modulo__curso=c,
        )
        avg_curso = intentos_curso.aggregate(p=Avg("puntaje"))["p"]
        total_obl = Leccion.objects.filter(
            modulo__curso=c, es_obligatoria=True
        ).count()
        done_obl = prog_curso.filter(
            estado=ProgresoLeccion.Estado.COMPLETADA,
            leccion__es_obligatoria=True,
        ).count()

        cursos_detalle.append(
            {
                "curso_id": c.id,
                "curso_slug": c.slug,
                "curso_titulo": c.titulo,
                "estado_inscripcion": insc.estado,
                "porcentaje_completado": float(insc.progreso_pct),
                "lecciones_completadas": done_obl,
                "lecciones_totales": total_obl,
                "tiempo_segundos": tiempo_curso,
                "tiempo_formato": formatear_tiempo(tiempo_curso),
                "desempeno_promedio": round(float(avg_curso or 0), 2),
                "intentos_evaluacion": intentos_curso.count(),
            }
        )

    return {
        "estudiante": {
            "id": user.id,
            "username": user.username,
            "nombre": user.get_full_name() or user.username,
        },
        "resumen": {
            "porcentaje_completado": pct_completado,
            "lecciones_completadas": completadas,
            "lecciones_totales": total_lecciones,
            "lecciones_en_progreso": en_progreso,
            "tiempo_segundos": tiempo_total,
            "tiempo_formato": formatear_tiempo(tiempo_total),
            "desempeno": {
                "promedio_puntaje": promedio_puntaje,
                "intentos": total_intentos,
                "aprobados": aprobados,
                "tasa_aprobacion_pct": tasa_aprobacion,
            },
            "cursos_inscritos": insc_qs.exclude(
                estado=Inscripcion.Estado.CANCELADA
            ).count(),
        },
        "cursos": cursos_detalle,
    }


def metricas_instructor(user) -> dict:
    """Panel instructor (extiende lo existente con tiempo y desempeño)."""
    from apps.cursos.models import Curso

    cursos = (
        Curso.objects.filter(instructor=user)
        .annotate(
            inscritos=Count(
                "inscripciones",
                filter=Q(
                    inscripciones__estado__in=[
                        Inscripcion.Estado.ACTIVA,
                        Inscripcion.Estado.COMPLETADA,
                    ]
                ),
                distinct=True,
            ),
            completados=Count(
                "inscripciones",
                filter=Q(inscripciones__estado=Inscripcion.Estado.COMPLETADA),
                distinct=True,
            ),
            promedio_progreso=Avg("inscripciones__progreso_pct"),
            lecciones=Count("modulos__lecciones", distinct=True),
        )
    )

    cursos_out = []
    for c in cursos:
        tiempo = (
            ProgresoLeccion.objects.filter(leccion__modulo__curso=c).aggregate(
                t=Sum("tiempo_segundos")
            )["t"]
            or 0
        )
        intentos = IntentoEvaluacion.objects.filter(
            evaluacion__leccion__modulo__curso=c,
            estado=IntentoEvaluacion.Estado.FINALIZADO,
        )
        agg = intentos.aggregate(
            promedio=Avg("puntaje"),
            total=Count("id"),
            aprobados=Count("id", filter=Q(aprobado=True)),
        )
        cursos_out.append(
            {
                "id": c.id,
                "titulo": c.titulo,
                "slug": c.slug,
                "inscritos": c.inscritos,
                "completados": c.completados,
                "promedio_progreso": round(float(c.promedio_progreso or 0), 2),
                "lecciones": c.lecciones,
                "tiempo_total_estudiantes_seg": int(tiempo),
                "tiempo_formato": formatear_tiempo(int(tiempo)),
                "desempeno_promedio": round(float(agg["promedio"] or 0), 2),
                "intentos_evaluacion": agg["total"] or 0,
                "aprobados": agg["aprobados"] or 0,
            }
        )

    intentos = (
        IntentoEvaluacion.objects.filter(
            evaluacion__leccion__modulo__curso__instructor=user,
            estado=IntentoEvaluacion.Estado.FINALIZADO,
        )
        .values("evaluacion__titulo")
        .annotate(
            total_intentos=Count("id"),
            aprobados=Count("id", filter=Q(aprobado=True)),
            promedio_puntaje=Avg("puntaje"),
        )
        .order_by("-total_intentos")[:20]
    )

    progreso_reciente = (
        ProgresoLeccion.objects.filter(leccion__modulo__curso__instructor=user)
        .select_related("estudiante", "leccion")
        .order_by("-actualizado_en")[:15]
        .values(
            "estudiante__username",
            "leccion__titulo",
            "estado",
            "porcentaje",
            "tiempo_segundos",
            "actualizado_en",
        )
    )

    return {
        "cursos": cursos_out,
        "evaluaciones": list(intentos),
        "actividad_reciente": list(progreso_reciente),
    }


def formatear_tiempo(segundos: int) -> str:
    segundos = max(0, int(segundos or 0))
    h, rem = divmod(segundos, 3600)
    m, s = divmod(rem, 60)
    if h:
        return f"{h}h {m:02d}m {s:02d}s"
    if m:
        return f"{m}m {s:02d}s"
    return f"{s}s"
