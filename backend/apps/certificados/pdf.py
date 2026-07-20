"""PDF del certificado digital con hash HMAC y código QR."""
from __future__ import annotations

from io import BytesIO

from django.utils import timezone
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import (
    Image,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from .qr import hash_corto, qr_verificacion_png, url_verificacion_frontend


def build_certificado_pdf(certificado) -> bytes:
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=landscape(A4),
        leftMargin=2 * cm,
        rightMargin=2 * cm,
        topMargin=1.5 * cm,
        bottomMargin=1.5 * cm,
        title=f"Certificado {certificado.codigo}",
        author="EduPath",
    )

    styles = getSampleStyleSheet()
    brand = ParagraphStyle(
        "Brand",
        parent=styles["Normal"],
        fontSize=14,
        textColor=colors.HexColor("#0f766e"),
        alignment=TA_CENTER,
        spaceAfter=6,
    )
    title = ParagraphStyle(
        "CertTitle",
        parent=styles["Heading1"],
        fontSize=26,
        alignment=TA_CENTER,
        textColor=colors.HexColor("#0f172a"),
        spaceAfter=12,
    )
    body = ParagraphStyle(
        "CertBody",
        parent=styles["Normal"],
        fontSize=12,
        alignment=TA_CENTER,
        leading=18,
        textColor=colors.HexColor("#334155"),
    )
    mono = ParagraphStyle(
        "Mono",
        parent=styles["Normal"],
        fontSize=9,
        alignment=TA_CENTER,
        textColor=colors.HexColor("#475569"),
        fontName="Courier",
    )

    estudiante = (
        certificado.estudiante.get_full_name() or certificado.estudiante.username
    )
    curso = certificado.curso.titulo
    emitido = timezone.localtime(certificado.emitido_en).strftime("%d/%m/%Y")
    firma = certificado.firma_hmac
    corto = hash_corto(firma)
    verify_url = url_verificacion_frontend(certificado.codigo)

    qr_bytes = qr_verificacion_png(certificado.codigo)
    qr_img = Image(BytesIO(qr_bytes), width=3.2 * cm, height=3.2 * cm)

    story = [
        Paragraph("EduPath LMS", brand),
        Paragraph("Certificado de finalización", title),
        Paragraph(
            f"Se otorga el presente certificado a<br/><b><font size='16'>{estudiante}</font></b>"
            f"<br/><br/>por haber completado satisfactoriamente el curso<br/>"
            f"<b><font size='14'>{curso}</font></b>"
            f"<br/><br/>Emitido el {emitido}",
            body,
        ),
        Spacer(1, 0.6 * cm),
    ]

    meta = Table(
        [
            [Paragraph(f"Código: {certificado.codigo}", mono)],
            [Paragraph(f"Hash HMAC-SHA256 (corto): {corto}", mono)],
            [Paragraph(f"Firma: {firma[:32]}…{firma[-8:]}", mono)],
            [Paragraph(f"Verificar: {verify_url}", mono)],
        ],
        colWidths=[22 * cm],
    )
    meta.setStyle(
        TableStyle(
            [
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                ("TOPPADDING", (0, 0), (-1, -1), 2),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
            ]
        )
    )
    story.append(meta)
    story.append(Spacer(1, 0.4 * cm))

    qr_table = Table([[qr_img], [Paragraph("Escanea para verificar (sin login)", mono)]], colWidths=[6 * cm])
    qr_table.setStyle(TableStyle([("ALIGN", (0, 0), (-1, -1), "CENTER")]))
    # Centrar envolviendo en otra tabla
    wrapper = Table([[qr_table]], colWidths=[24 * cm])
    wrapper.setStyle(TableStyle([("ALIGN", (0, 0), (-1, -1), "CENTER")]))
    story.append(wrapper)

    doc.build(story)
    return buffer.getvalue()
