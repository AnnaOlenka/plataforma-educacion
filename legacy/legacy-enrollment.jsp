<%@ page contentType="text/html;charset=UTF-8" language="java" %>
<%@ page import="java.io.*, java.net.*, java.nio.charset.StandardCharsets, java.util.*" %>
<%--
  legacy-enrollment.jsp
  Procesa inscripciones masivas desde CSV y las sincroniza con Django
  vía POST /api/legacy/enrollment-sync/

  CSV esperado (con cabecera):
    email,username,curso_slug
--%>
<%!
    String escapeJson(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\").replace("\"", "\\\"")
                .replace("\n", "\\n").replace("\r", "");
    }

    String postJson(String urlStr, String apiKey, String body) throws Exception {
        URL url = new URL(urlStr);
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        conn.setRequestMethod("POST");
        conn.setDoOutput(true);
        conn.setRequestProperty("Content-Type", "application/json; charset=UTF-8");
        conn.setRequestProperty("X-Legacy-Api-Key", apiKey);
        conn.setConnectTimeout(10000);
        conn.setReadTimeout(30000);
        try (OutputStream os = conn.getOutputStream()) {
            os.write(body.getBytes(StandardCharsets.UTF_8));
        }
        int code = conn.getResponseCode();
        InputStream is = (code >= 200 && code < 300) ? conn.getInputStream() : conn.getErrorStream();
        StringBuilder sb = new StringBuilder();
        if (is != null) {
            try (BufferedReader br = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8))) {
                String line;
                while ((line = br.readLine()) != null) sb.append(line);
            }
        }
        return "HTTP " + code + " · " + sb;
    }
%>
<%
    String djangoUrl = application.getInitParameter("django.sync.url");
    if (djangoUrl == null || djangoUrl.isEmpty()) {
        djangoUrl = System.getenv().getOrDefault(
            "DJANGO_SYNC_URL",
            "http://backend:8000/api/legacy/enrollment-sync/"
        );
    }
    String apiKey = application.getInitParameter("django.sync.apiKey");
    if (apiKey == null || apiKey.isEmpty()) {
        apiKey = System.getenv().getOrDefault("LEGACY_SYNC_API_KEY", "legacy-dev-key");
    }

    String resultMsg = null;
    String preview = null;

    if ("POST".equalsIgnoreCase(request.getMethod())) {
        Part filePart = request.getPart("csvFile");
        if (filePart == null || filePart.getSize() == 0) {
            resultMsg = "Error: no se recibió archivo CSV.";
        } else {
            List<String> enrollments = new ArrayList<>();
            try (BufferedReader reader = new BufferedReader(
                    new InputStreamReader(filePart.getInputStream(), StandardCharsets.UTF_8))) {
                String line;
                boolean first = true;
                while ((line = reader.readLine()) != null) {
                    line = line.trim();
                    if (line.isEmpty()) continue;
                    if (first && line.toLowerCase().startsWith("email")) {
                        first = false;
                        continue;
                    }
                    first = false;
                    String[] cols = line.split(",", -1);
                    if (cols.length < 3) continue;
                    String email = cols[0].trim();
                    String username = cols[1].trim();
                    String cursoSlug = cols[2].trim();
                    enrollments.add(
                        "{\"email\":\"" + escapeJson(email) +
                        "\",\"username\":\"" + escapeJson(username) +
                        "\",\"curso_slug\":\"" + escapeJson(cursoSlug) +
                        "\",\"origen\":\"legacy_csv\"}"
                    );
                }
            }
            StringBuilder json = new StringBuilder("{\"enrollments\":[");
            for (int i = 0; i < enrollments.size(); i++) {
                if (i > 0) json.append(",");
                json.append(enrollments.get(i));
            }
            json.append("]}");
            preview = "Filas parseadas: " + enrollments.size();
            try {
                resultMsg = postJson(djangoUrl, apiKey, json.toString());
            } catch (Exception ex) {
                resultMsg = "Fallo de sincronización: " + ex.getMessage();
            }
        }
    }
%>
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Legacy Enrollment — EduPath</title>
  <style>
    body { font-family: Georgia, serif; max-width: 640px; margin: 2rem auto; padding: 0 1rem; color: #0f1c18; background: #f3f0e8; }
    h1 { color: #146349; }
    .box { background: #fff; border: 1px solid #cfd8d3; padding: 1.25rem; }
    code { font-size: 0.85rem; }
    .ok { color: #146349; }
    .err { color: #8b1e1e; }
  </style>
</head>
<body>
  <h1>Inscripción masiva (legacy)</h1>
  <p>Carga un CSV y sincroniza con Django DRF. Puente temporal hacia el LMS moderno.</p>
  <div class="box">
    <form method="post" enctype="multipart/form-data">
      <p>
        <label for="csvFile">Archivo CSV</label><br/>
        <input type="file" id="csvFile" name="csvFile" accept=".csv,text/csv" required />
      </p>
      <p><small>Formato: <code>email,username,curso_slug</code></small></p>
      <button type="submit">Procesar y sincronizar</button>
    </form>
  </div>
  <% if (preview != null) { %>
    <p><%= preview %></p>
  <% } %>
  <% if (resultMsg != null) { %>
    <pre class="<%= resultMsg.startsWith("HTTP 2") ? "ok" : "err" %>"><%= resultMsg %></pre>
  <% } %>
  <p><small>Endpoint Django: <code><%= djangoUrl %></code></small></p>
</body>
</html>
