"""Paginación por módulo — PAGE_SIZE configurable vía query ?page_size=."""
from rest_framework.pagination import PageNumberPagination


class ModuloPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = "page_size"
    max_page_size = 50
