from django.urls import path

from .legacy_views import LegacyEnrollmentSyncView

urlpatterns = [
    path("enrollment-sync/", LegacyEnrollmentSyncView.as_view(), name="legacy-enrollment-sync"),
]
