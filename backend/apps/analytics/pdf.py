"""
Generación de PDF del dashboard de progreso (ReportLab).
"""
from __future__ import annotations

from io import BytesIO

from django.utils import timezone
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import (
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


def build_dashboard_pdf(metricas: dict, titulo: str = "Dashboard de progreso") -> bytes:
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=1.8 * cm,
        rightMargin=1.8 * cm,
        topMargin=1.8 * cm,
        bottomMargin=1.8 * cm,
        title=titulo,
        author="EduPath",
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "TitleEdu",
        parent=styles["Heading1"],
        fontSize=18,
        alignment=TA_CENTER,
        spaceAfter=8,
        textColor=colors.HexColor("#0f172a"),
    )
    subtitle = ParagraphStyle(
        "SubEdu",
        parent=styles["Normal"],
        fontSize=10,
        alignment=TA_CENTER,
        textColor=colors.HexColor("#64748b"),
        spaceAfter=16,
    )
    h2 = ParagraphStyle(
        "H2Edu",
        parent=styles["Heading2"],
        fontSize=13,
        textColor=colors.HexColor("#1e293b"),
        spaceBefore=12,
        spaceAfter=8,
    )
    body = ParagraphStyle(
        "BodyEdu",
        parent=styles["Normal"],
        fontSize=10,
        alignment=TA_LEFT,
        leading=14,
    )

    estudiante = metricas.get("estudiante", {})
    resumen = metricas.get("resumen", {})
    desempeno = resumen.get("desempeno", {})
    cursos = metricas.get("cursos", [])

    story = [
        Paragraph("EduPath — Informe de progreso", title_style),
        Paragraph(
            f"{titulo}<br/>Generado: {timezone.now().strftime('%Y-%m-%d %H:%M')}",
            subtitle,
        ),
        Paragraph(
            f"<b>Estudiante:</b> {estudiante.get('nombre', '')} "
            f"(@{estudiante.get('username', '')})",
            body,
        ),
        Spacer(1, 0.4 * cm),
        Paragraph("Resumen de métricas", h2),
    ]

    resumen_data = [
        ["Métrica", "Valor"],
        ["% completado", f"{resumen.get('porcentaje_completado', 0)} %"],
        [
            "Lecciones",
            f"{resumen.get('lecciones_completadas', 0)} / "
            f"{resumen.get('lecciones_totales', 0)}",
        ],
        ["En progreso", str(resumen.get("lecciones_en_progreso", 0))],
        ["Tiempo total", resumen.get("tiempo_formato", "0s")],
        ["Desempeño (promedio)", f"{desempeno.get('promedio_puntaje', 0)} %"],
        [
            "Intentos / aprobados",
            f"{desempeno.get('intentos', 0)} / {desempeno.get('aprobados', 0)}",
        ],
        ["Tasa de aprobación", f"{desempeno.get('tasa_aprobacion_pct', 0)} %"],
    ]

    table = Table(resumen_data, colWidths=[8 * cm, 7 * cm])
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e293b")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 10),
                ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#cbd5e1")),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    story.append(table)

    if cursos:
        story.append(Paragraph("Detalle por curso", h2))
        curso_rows = [
            ["Curso", "%", "Tiempo", "Desempeño", "Estado"]
        ]
        for c in cursos:
            curso_rows.append(
                [
                    (c.get("curso_titulo") or "")[:32],
                    f"{c.get('porcentaje_completado', 0)}%",
                    c.get("tiempo_formato", "0s"),
                    f"{c.get('desempeno_promedio', 0)}%",
                    c.get("estado_inscripcion", ""),
                ]
            )
        t2 = Table(curso_rows, colWidths=[6 * cm, 2 * cm, 3 * cm, 2.5 * cm, 2.5 * cm])
        t2.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0f766e")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, -1), 9),
                    ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#cbd5e1")),
                    (
                        "ROWBACKGROUNDS",
                        (0, 1),
                        (-1, -1),
                        [colors.white, colors.HexColor("#f0fdfa")],
                    ),
                    ("LEFTPADDING", (0, 0), (-1, -1), 6),
                    ("TOPPADDING", (0, 0), (-1, -1), 5),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                ]
            )
        )
        story.append(t2)

    story.append(Spacer(1, 1 * cm))
    story.append(
        Paragraph(
            "Documento generado automáticamente por EduPath LMS. "
            "Incluye porcentaje completado, tiempo de estudio y desempeño en evaluaciones.",
            ParagraphStyle(
                "Foot",
                parent=body,
                fontSize=8,
                textColor=colors.HexColor("#94a3b8"),
                alignment=TA_CENTER,
            ),
        )
    )

    doc.build(story)
    return buffer.getvalue()
