Положите сюда файлы документов (.docx), которые будет открывать ONLYOFFICE Document Server.

Пример:
  infra/docs/protokol-doprosa.docx  →  будет доступен как
  http://docs:80/protokol-doprosa.docx      (из сети контейнеров — для Document Server)
  http://localhost:8090/protokol-doprosa.docx  (из браузера — для проверки)

В админ-панели «Серверы → ONLYOFFICE → URL документа» указывайте адрес,
доступный ИМЕННО ИЗ КОНТЕЙНЕРА Document Server:
  http://docs/protokol-doprosa.docx   (сервисы compose видят друг друга по имени)
