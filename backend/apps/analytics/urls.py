from django.urls import path

from .views import (
    DashboardExportPDFView,
    EstudianteCursoDashboardView,
    EstudianteDashboardView,
    InstructorAnalyticsView,
    InstructorExportPDFView,
)

urlpatterns = [
    path(
        "analytics/dashboard/",
        EstudianteDashboardView.as_view(),
        name="analytics-dashboard",
    ),
    path(
        "analytics/dashboard/exportar.pdf",
        DashboardExportPDFView.as_view(),
        name="analytics-dashboard-pdf",
    ),
    path(
        "analytics/dashboard/curso/<slug:slug>/",
        EstudianteCursoDashboardView.as_view(),
        name="analytics-dashboard-curso",
    ),
    path(
        "analytics/dashboard/curso/<slug:slug>/exportar.pdf",
        DashboardExportPDFView.as_view(),
        name="analytics-dashboard-curso-pdf",
    ),
    path(
        "analytics/instructor/",
        InstructorAnalyticsView.as_view(),
        name="analytics-instructor",
    ),
    path(
        "analytics/instructor/exportar.pdf",
        InstructorExportPDFView.as_view(),
        name="analytics-instructor-pdf",
    ),
]
