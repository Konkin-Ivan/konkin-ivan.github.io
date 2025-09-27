+++
date = '2025-08-22'
draft = false
toc = true
title = 'Библиотека для трейдинга: cоздаем проект'
description = 'Разберем самый первый и важный этап — настройку рабочего окружения с помощью Docker. Это гарантирует, что у всех разработчиков, независимо от ОС, будет идентичная среда для работы с проектом.'
summary = "Разберем самый первый и важный этап — настройку рабочего окружения с помощью Docker. Это гарантирует, что у всех разработчиков, независимо от ОС, будет идентичная среда для работы с проектом."
image = "/images/posts/taljure/taljure-1.png"  # Обложка поста
image_alt = "Создание проекта taljure"
tags = ["clojure", "библиотека_taljure"]
+++

# Библиотека для трейдинга: cоздаем проект

## Создаем проект на Clojure: Настраиваем Docker-окружение для библиотеки алготрейдинга

![Создание проекта taljure](/images/posts/taljure/taljure-1.png)

В предыдущем посте я анонсировал создание open-source библиотеки для алготрейдинга на Clojure. Сегодня разберем самый первый и важный этап — настройку рабочего окружения с помощью Docker. Это гарантирует, что у всех разработчиков, независимо от ОС, будет идентичная среда для работы с проектом.

В моей ОС не установлен Clojure, Clojure-LSP, JDK и прочие нужные программы и утилиты, для разработки, поэтому все нужное буду запускать в докер-контейнере.

#### **Структура проекта**

Для начала создадим базовую структуру каталогов. Она может меняться по мере развития проекта, но стартовая выглядит так:
```bash
.
├── deps.edn
├── _docker
│   └── app
│       └── Dockerfile
├── docker-compose.yml
├── Makefile
├── README.md
├── src
│   └── taljure
│       ├── core.clj
│       └── indicators
│           └── simple.clj
└── test
    └── taljure
        └── indicators
            └── simple
                ├── atr_test.clj
                ├── ema_test.clj
                ├── rsi_test.clj
                ├── sma_test.clj
                ├── stochastic_test.clj
                └── vwap_test.clj
                
```

Ключевые моменты:

- **`_docker/app/Dockerfile`** — инструкция для сборки нашего контейнера.
- **`docker-compose.yml`** — для управления сервисами (пока что одним — `app`).
- **`src/`** — исходный код библиотеки с модулями для индикаторов.
- **`test/`** — тесты, сразу заложенные под будущие индикаторы.

#### **Dockerfile: основа нашего окружения**

Начнем с Dockerfile. Нам нужен образ с последней версией Clojure и базовыми утилитами.
```dockerfile
# _docker/app/Dockerfile
# Используем официальный образ Clojure
FROM clojure:latest

# Устанавливаем необходимые пакеты
RUN apt-get update && \
    apt-get install -y \
        curl \
        git \
        wget \
        rlwrap && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Создаём пользователя с тем же UID/GID, что и на хосте
ARG USER_ID=1000
ARG GROUP_ID=1000
RUN groupadd -g ${GROUP_ID} clojure-user && \
    useradd -u ${USER_ID} -g clojure-user -m clojure-user

# Устанавливаем рабочую директорию
WORKDIR /usr/src/taljure/

# Меняем владельца рабочей директории
RUN chown -R clojure-user:clojure-user /usr/src/taljure

# Переключаемся на созданного пользователя
USER clojure-user

# Открываем порт для REPL
EXPOSE 4444

# Запускаем nREPL-сервер при старте контейнера
CMD ["clojure", "-Sdeps", "{:deps {nrepl/nrepl {:mvn/version \"1.0.0\"}}}", "-M", "-m", "nrepl.cmdline", "--port", "4444", "--bind", "0.0.0.0"]
```

**Что здесь важно:**

1. Создаем пользователя `clojure-user` с вашими ID из хостовой системы, чтобы избежать проблем с правами на монтируемые файлы.
2. Устанавливаем `rlwrap` для удобной работы с REPL в контейнере.
3. По умолчанию контейнер запускает nREPL-сервер на порту 4444.

#### **Docker Compose: управляем сервисами**

Файл `docker-compose.yml` упрощает запуск и управление контейнером.
```yaml
# docker-compose.yml
services:
  app:
    build:
      context: .
      dockerfile: _docker/app/Dockerfile
    container_name: "${PROJECT_NAME}_app" # Имя контейнера
    volumes:
      - ./:/usr/src/taljure/ # Монтирование текущей директории
    ports:
      - 4444:4444 # Проброс порта REPL
    environment:
      - NREPL_HOST=0.0.0.0 # Разрешить подключение к REPL извне
      - NREPL_PORT=4444 # Порт для REPL
      - JAVA_TOOL_OPTIONS=-Dfile.encoding=UTF-8
      - LANG=C.UTF-8
    networks:
      - clojure-net

networks:
  clojure-net:
    driver: bridge
    
```

#### Конфигурация в .env

Файл `.env` :
```bash
DOMAIN=local.local
PROJECT_NAME=taljure
```

Makefile:
```bash
up:
	docker-compose up -d

stop:
	docker-compose stop

build:
	docker-compose up -d --build

restart:
	make stop && make up
```

**Пояснения:**

- `volumes` монтирует текущую директорию проекта в контейнер, позволяя работать с кодом в реальном времени.
- `ports` пробрасывает порт 4444 для подключения к nREPL из IDE на вашей машине.
- Переменная `PROJECT_NAME` задается через `.env` файл или прямо в командной строке.

#### **Проверка работоспособности: Hello World!**

Создадим простой namespace `taljure.core` для проверки.
```clojure
;; src/taljure/core.clj
(ns taljure.core)

(defn -main
  "Точка входа в приложение. Пока что просто Hello World."
  [& args]
  (println "Hello, World! 🚀"))
 ```
 
### Теперь соберем и запустим наш проект.

**Собираем и запускаем контейнер:**
```bash
make up
```

**Запускаем наше приложение внутри контейнера:**
```bash
make run
```

Если все настроено корректно, в логах видим:
```bash
Hello, World! 🚀
```

**Проверяем REPL:**  
Подключитесь к nREPL на `localhost:4444` из вашей IDE (Calva, CIDER и др.). Если подключение прошло успешно — окружение готово к разработке!

#### **Что дальше?**

Мы успешно создали изолированное и воспроизводимое окружение для разработки на Clojure. В следующей статье:

- Разберем `deps.edn` и подключим основные зависимости.
- Напишем первые тесты и реализацию простейшего индикатора (SMA).
- Настроим CI для автоматического прогона тестов.

Исходный код базового приложения будет доступен на [GitFlic](https://gitflic.ru/project/konkin/slj_base_docker_cli) (можно участвовать).

Если у вас есть вопросы или предложения по настройке окружения — добро пожаловать в комментарии!
