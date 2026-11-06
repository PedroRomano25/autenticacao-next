-- Executado só na primeira inicialização do volume do MySQL.
-- Um único contêiner hospeda o banco de desenvolvimento e o de testes.
CREATE DATABASE IF NOT EXISTS `auth_dev` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
CREATE DATABASE IF NOT EXISTS `auth_test` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

GRANT ALL PRIVILEGES ON `auth_dev`.* TO 'auth'@'%';
GRANT ALL PRIVILEGES ON `auth_test`.* TO 'auth'@'%';
FLUSH PRIVILEGES;
