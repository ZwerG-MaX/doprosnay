Хранилище документов — Nextcloud (сервис `cloud` в docker-compose.yml).

Рабочий процесс:
1. Откройте http://cloud.local  (админ: admin / rt-cloud-2026).
2. Загрузите .docx-протоколы через веб-интерфейс или WebDAV:
     http://cloud.local/remote.php/dav/files/admin/Docs/
3. Для ONLYOFFICE Document Server сформируйте прямой URL документа:
     публичная ссылка:  http://cloud/index.php/s/<ТОКЕН>/download
     webdav:            http://admin:ПАРОЛЬ@cloud/remote.php/dav/files/admin/Docs/файл.docx
   (имя `cloud` резолвится из контейнера Document Server по compose-сети)
4. Вставьте URL в админ-панели пульта: «СЕРВЕРЫ → ONLYOFFICE → URL документа».

Локальные файлы в этой папке можно использовать как исходники для загрузки.
