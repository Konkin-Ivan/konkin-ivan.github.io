+++
date = '2025-07-10'
draft = false
toc = true
title = 'РедОС: Идеальная система'
description = 'Мой путь в Linux начался с Debian — строгого, надёжного, но порой слишком консервативного.'
summary = "Мой путь в Linux начался с Debian — строгого, надёжного, но порой слишком консервативного."
image = "/images/posts/redos/redos.png"  # Обложка поста
image_alt = "РедОС + Sway"
tags = ["linux"]
+++

# РедОС: Идеальная система, но не для кодинга?

Мой путь в Linux начался с Debian — строгого, надёжного, но порой слишком консервативного. Потом был Arch (и теперь есть) с его бесконечной гибкостью. Были и другие дистрибутивы: Fedora, AltLinux, openSUSE, даже Gentoo (но это уже другая история).

И вот — **РедОС**. Российский дистрибутив, о котором многие говорят, но мало кто реально использует. Мне стало интересно: что это за зверь такой? Маркетинговый пузырь или действительно рабочая альтернатива?

**Первые впечатления:**  
Я ожидал боли. Обычно с новыми дистрибутивами так: Wi-Fi не работает, тачпад криво определяется, драйвера подбираешь неделю. Но тут… **всё заработало сразу**. Без танцев с бубном, без гугления просто — установил и пользуйся. Предыдущий опыт был с [Альт](https://dzen.ru/a/ZxYypI87mSlPxSSo), не на столько хорошим.

Но главное — **ноутбук перестал греться и шуметь вентиляторами**.

Однако всё изменилось, когда я попробовал использовать РедОС **для разработки**. Понятно, что РедОС заточен под корпоративный сектор, но попробуем его юзать не по прямому назначению. Уж очень хорошо эта ОС себя чувствует на моем:  
```bash
Kernel: 6.12.21-1.red80.x86_64 
CPU: Intel i5-3230M (4) @ 3.200GHz 
GPU: NVIDIA GeForce GT 650M 
GPU: Intel 3rd Gen Core processor Gr 
Memory: 1878MiB / 15876MiB 
```
## **Установка и первое впечатление**

Обычно установка Linux — это квест. Wi-Fi не ловит, тачпад не скроллит, драйвер видеокарты ставится через `--force-all`. Но с **РедОС** всё было иначе.

#### **«Из коробки» — значит, действительно из коробки**

- **Wi-Fi** заработал сразу — даже на моём ноутбуке с RTL8723AE PCIe Wireless Networ Adapter.
- **Тачпад** распознался правильно: жесты, мультитач, скролл — без лишних `xinput` и `libinput`.
- **Драйвера NVIDIA** не ставил, штатный nouveau хорошо справляется.
- **Языковая раскладка** переключалась без танцев с `setxkbmap` — просто выбрал в настройках.

### **Термический рай**

После Arch с его вечно взлетающими до 60°C на `htop` и Debian, **РедОС показал чудеса энергоэффективности**:

- В простое температура CPU — **45-61°C** (против 50-70°C в Debian).
- Под нагрузкой (браузер + пара терминалов) — **максимум 65°C**, и то ненадолго.
- Вентиляторы **почти не слышно** — даже при рендеринге видео в Firefox.

**Вывод:** Если бы мне нужно было **просто поставить систему и забыть** — я бы выбрал РедОС без колебаний.

### **Кодинг в РедОС: «Стоит зайти в терминал — и добро пожаловать в ад зависимостей»**

Поставил систему, в которой **ничего не нужно настраивать**. Но я же привык после установки что-то настраивать. И что настраивать в системе в которой ничего не нужно настраивать? Первое, за что взялся — **рабочее окружение**. Ведь я привык к тактильной эргономике: хоткеи под пальцы, tiling WM, кастомные скрипты — всё, без чего кодятся уже не так комфортно.

### **«Где мой Hyprland? Или хотя бы SwayFX?»**

Первая же проверка репозиториев разочаровала:

- **Нет Hyprland** в репозиториях.
- **Нет даже SwayFX и Hyprland** не возможно поставить склонировав репозиторий.
- **Обычный Sway** есть.

«Ну окей, соберу из исходников!» — наивно подумал я.

### **Сборка из исходников: «Ребус из зависимостей»**

Тут начался настоящий квест:

1. **Не хватает `wlroots`** — ладно, ставлю.
2. **А этому `wlroots` нужны свои зависимости**.
3. **Добавляю EPEL** — не помогло, там тоже не та версия.
4. В системе установлены более старые некоторые пакеты, чем нужны для некоторых библиотек и все упирается в конфликт версий.

Это напомнило мне **игру в матрёшку**: чтобы собрать X, нужен Y, а для Y — Z, который зависит от W… и так до бесконечности.

### **«В других дистрах это есть по умолчанию!»**

То, что в **Arch** или **Fedora** ставится одной командой (`pacman -S hyprland`), в РедОС превратилось в **многочасовой квест**. Причём половина зависимостей либо **устарела**, либо **отсутствует** даже в сторонних репозиториях.

## **РедОС для кодинга**

![РедОС + Sway](/images/posts/redos/redos.png)

После нескольких часов борьбы с зависимостями я понял: если хочешь modern Wayland-окружение в РедОС — используй sway. Вот как выглядел мой путь к рабочему окружению:

### **Спасительный Sway (минимально рабочий вариант)**

1. **Базовый Sway из репозиториев** — без красивостей
2. Панель waybar
3. wofi
4. Neovim в качестве редактора

### **Базовый Sway**

`~/.config/sway/config`

Исходники [GitFlic](https://gitflic.ru/project/konkin/sway)
```bash
# Автозапуск ibus для работы с вводом (русская раскладка и т.д.)
exec_always ibus-daemon -drx

### ВНЕШНИЙ ВИД ###

# Отступы между окнами
gaps inner 10

# Отступы от краёв экрана
gaps outer 10

# Дополнительные отступы для плавающих окон
gaps horizontal 10
gaps vertical 10

# Умные отступы (автоматически скрываются при одном окне)
smart_gaps on
smart_borders on

# Стиль границ окон (толщина 4px)
default_border pixel 4

# Цветовая схема Dracula для окон:
# [активное] [неактивное] [неактивное+нефокус] [срочное]
client.focused          #8be9fd #44475a #f8f8f2 #8be9fd
client.unfocused        #282a36 #282a36 #6272a4 #282a36
client.focused_inactive #44475a #282a36 #f8f8f2 #44475a
client.urgent          #ff5555 #ff5555 #f8f8f2 #ff5555

# Тема курсора мыши (Catppuccin Mocha Dark)
seat * xcursor_theme catppuccin-mocha-dark-cursors 25

### ПЕРЕМЕННЫЕ ###
# Основная модификаторная клавиша (Win)
set $mod Mod4

# Навигация в стиле Vim
set $left h
set $down j
set $up k
set $right l

# Терминал по умолчанию
set $term foot

### НАСТРОЙКА ВЫВОДА ###
# Обои рабочего стола (заполнение экрана)
output * bg ~/bg/i.webp fill

### СОЧЕТАНИЯ КЛАВИШ ###
# Основные:
    # Запуск терминала
    bindsym $mod+Return exec $term

    # Закрыть текущее окно
    bindsym $mod+c kill

    # Меню приложений (wofi)
    bindsym $mod+space exec wofi --show drun

    # Плавающий режим по умолчанию
    floating_modifier $mod normal

    # Перезагрузка конфига Sway
    bindsym $mod+Shift+c reload

    # Меню выключения (кастомный скрипт)
    bindsym $mod+q exec ~/.config/sway/scripts/power-menu.sh

# Навигация:
    # Перемещение фокуса
    bindsym $mod+$left focus left
    bindsym $mod+$down focus down
    bindsym $mod+$up focus up
    bindsym $mod+$right focus right
    # Альтернатива - стрелки
    bindsym $mod+Left focus left
    bindsym $mod+Down focus down
    bindsym $mod+Up focus up
    bindsym $mod+Right focus right

    # Перемещение окон
    bindsym $mod+Shift+$left move left
    bindsym $mod+Shift+$down move down
    bindsym $mod+Shift+$up move up
    bindsym $mod+Shift+$right move right
    # Альтернатива - стрелки
    bindsym $mod+Shift+Left move left
    bindsym $mod+Shift+Down move down
    bindsym $mod+Shift+Up move up
    bindsym $mod+Shift+Right move right

# Рабочие пространства:
    # Переключение между рабочими пространствами 1-10
    bindsym $mod+1 workspace number 1
    bindsym $mod+2 workspace number 2
    bindsym $mod+3 workspace number 3
    bindsym $mod+4 workspace number 4
    bindsym $mod+5 workspace number 5
    bindsym $mod+6 workspace number 6
    bindsym $mod+7 workspace number 7
    bindsym $mod+8 workspace number 8
    bindsym $mod+9 workspace number 9
    bindsym $mod+0 workspace number 10

    # Перемещение окон между рабочими пространствами
    bindsym $mod+Shift+1 move container to workspace number 1
    bindsym $mod+Shift+2 move container to workspace number 2
    bindsym $mod+Shift+3 move container to workspace number 3
    bindsym $mod+Shift+4 move container to workspace number 4
    bindsym $mod+Shift+5 move container to workspace number 5
    bindsym $mod+Shift+6 move container to workspace number 6
    bindsym $mod+Shift+7 move container to workspace number 7
    bindsym $mod+Shift+8 move container to workspace number 8
    bindsym $mod+Shift+9 move container to workspace number 9
    bindsym $mod+Shift+0 move container to workspace number 10

# Управление окнами:
    # Разделение окон (горизонтальное/вертикальное)
    bindsym $mod+b splith
    bindsym $mod+v splitv

    # Смена режима расположения окон
    bindsym $mod+s layout stacking  # стопка
    bindsym $mod+w layout tabbed    # вкладки
    bindsym $mod+e layout toggle split  # переключение режимов

    # Полноэкранный режим
    bindsym $mod+f fullscreen

    # Переключение в плавающий режим
    bindsym $mod+Shift+space floating toggle

    # Переключение фокуса между плиточными и плавающими окнами
    bindsym $mod+d focus mode_toggle

    # Фокус на родительский контейнер
    bindsym $mod+a focus parent

# Блокнот (Scratchpad):
    # Отправить окно в блокнот
    bindsym $mod+Shift+minus move scratchpad

    # Показать/скрыть окно из блокнота
    bindsym $mod+minus scratchpad show

# Изменение размеров окон:
mode "resize" {
    # Управление размерами:
    # h/j/k/l или стрелки - изменение размеров
    bindsym $left resize shrink width 10px
    bindsym $down resize grow height 10px
    bindsym $up resize shrink height 10px
    bindsym $right resize grow width 10px

    # Альтернатива - стрелки
    bindsym Left resize shrink width 10px
    bindsym Down resize grow height 10px
    bindsym Up resize shrink height 10px
    bindsym Right resize grow width 10px

    # Выход из режима изменения размеров
    bindsym Return mode "default"
    bindsym Escape mode "default"
}
# Активация режима изменения размеров
bindsym $mod+r mode "resize"

# Скриншоты:
# Весь экран - PrintScreen
bindsym Print exec grim ~/Изображения/screenshot-$(date +"%Y-%m-%d-%H%M%S").png

# Выбранная область - Shift+PrintScreen
bindsym Shift+Print exec grim -g "$(slurp)" ~/Изображения/screenshot-$(date +"%Y-%m-%d-%H%M%S").png

# Настройка клавиатуры (раскладки US/RU с переключением по Alt+Shift)
input type:keyboard {
    xkb_layout "us,ru"
    xkb_options "grp:alt_shift_toggle"
}

# Подключение дополнительных конфигов из системы
include /etc/sway/config.d/*
```

Шпаргалка по сочетаниям клавиш Sway

**Основные:**

- `Win+Enter` - запустить терминал (Foot)
- `Win+c` - закрыть текущее окно
- `Win+Space` - меню приложений (Wofi)
- `Win+Shift+c` - перезагрузить конфиг
- `Win+q` - меню выключения

**Навигация:**

- `Win+h/j/k/l` или `Win+Стрелки` - переместить фокус
- `Win+Shift+h/j/k/l` или `Win+Shift+Стрелки` - переместить окно

**Рабочие пространства:**

- `Win+1..0` - переключиться на workspace 1-10
- `Win+Shift+1..0` - переместить окно на workspace 1-10

**Управление окнами:**

- `Win+b` - разделить горизонтально
- `Win+v` - разделить вертикально
- `Win+s` - режим "стопка"
- `Win+w` - режим "вкладки"
- `Win+e` - переключить режим разделения
- `Win+f` - полноэкранный режим
- `Win+Shift+Space` - переключить плавающий режим
- `Win+d` - переключить фокус между плиточными/плавающими окнами

**Блокнот (Scratchpad):**

- `Win+Shift+-` - отправить окно в блокнот
- `Win+-` - показать/скрыть окно из блокнота

**Изменение размеров:**

- `Win+r` - войти в режим изменения размеров

- `h/j/k/l` или `Стрелки` - изменять размеры
- `Enter/Esc` - выйти из режима

**Скриншоты:**

- `PrintScreen` - снимок всего экрана
- `Shift+PrintScreen` - снимок выделенной области

**Раскладка клавиатуры:**

- `Alt+Shift` - переключение US/RU

**Советы:**

1. Все сочетания работают через Win (Mod4)
2. Для навигации можно использовать как Vim-стиль (h/j/k/l), так и стрелки
3. В режиме изменения размеров сначала жмем `Win+r`, затем управляем размерами

### Панель waybar

`~/.config/waybar/config.json`

Исходники [GitFlic](https://gitflic.ru/project/konkin/waybar)
```bash
{
  "layer": "top",
  "position": "top",
  "height": 34,
  "spacing": 3,
  "modules-left": ["sway/workspaces"],
  "modules-center": ["sway/window"],
  "modules-right": ["cpu", "memory", "pulseaudio", "clock", "tray"],

  "sway/workspaces": {
    "format": "{name}",
    "on-click": "activate",
    "all-outputs": true
  },

  "sway/window": {
    "format": "{}",
    "max-length": 50,
    "strip": true
  },

  "clock": {
    "format": " {:%H:%M}",
    "tooltip-format": " {:%d.%m.%Y}"
  },

  "cpu": {
    "format": " {usage}%",
    "interval": 2
  },

  "memory": {
    "format": " {used:0.1f}G",
    "interval": 5
  },

  "pulseaudio": {
    "format": "{icon} {volume}%",
    "format-muted": " MUTED",
    "format-icons": ["", "", ""],
    "on-click": "pactl set-sink-mute @DEFAULT_SINK@ toggle",
    "on-scroll-up": "pactl set-sink-volume @DEFAULT_SINK@ +5%",
    "on-scroll-down": "pactl set-sink-volume @DEFAULT_SINK@ -5%"
  },

  "tray": {
    "spacing": 6
  }
}
```

`~/.config/waybar/style.css`
```bash
* {
  min-height: 0;
  min-width: 0;
  font-family: Lexend, "JetBrainsMono NFP";
  font-size: 16px;
  font-weight: 600;
}

window#waybar {
  transition-property: background-color;
  transition-duration: 0.5s;
  /* background-color: #1e1e2e; */
  /* background-color: #181825; */
  background-color: #11111b;
  /* background-color: rgba(24, 24, 37, 0.6); */
}

#workspaces button {
  padding: 0.3rem 0.6rem;
  margin: 0.4rem 0.25rem;
  border-radius: 6px;
  /* background-color: #181825; */
  background-color: #1e1e2e;
  color: #cdd6f4;
}

#workspaces button:hover {
  color: #1e1e2e;
  background-color: #cdd6f4;
}

#workspaces button.focused {
  background-color: #1e1e2e;
  color: #89b4fa;
}

#workspaces button.urgent {
  background-color: #1e1e2e;
  color: #f38ba8;
}

#clock,
#pulseaudio,
#custom-logo,
#custom-power,
#custom-spotify,
#custom-notification,
#cpu,
#tray,
#memory,
#window,
#mpris {
  padding: 0.3rem 0.6rem;
  margin: 0.4rem 0.25rem;
  border-radius: 6px;
  /* background-color: #181825; */
  background-color: #1e1e2e;
}

#mpris.playing {
  color: #a6e3a1;
}

#mpris.paused {
  color: #9399b2;
}

#custom-sep {
  padding: 0px;
  color: #585b70;
}

window#waybar.empty #window {
  background-color: transparent;
}

#cpu {
  color: #94e2d5;
}

#memory {
  color: #cba6f7;
}

#clock {
  color: #74c7ec;
}

#clock.simpleclock {
  color: #89b4fa;
}

#window {
  color: #cdd6f4;
}

#pulseaudio {
  color: #b4befe;
}

#pulseaudio.muted {
  color: #a6adc8;
}

#custom-logo {
  color: #89b4fa;
}

#custom-power {
  color: #f38ba8;
}

tooltip {
  background-color: #181825;
  border: 2px solid #89b4fa;
}
```
### wofi

`~/.config/wofi/config`  
Исходники [GitFlic](https://gitflic.ru/project/konkin/fowi)
```bash
width=500
height=300
location=center
allow_markup=true
always_parse_args=true
show=drun
prompt=🔍
term=foot

~/.config/wofi/style.css

/* Dracula Theme for Wofi */
window {
    margin: 5px;
    border: 2px solid #bd93f9;
    border-radius: 8px;
    background-color: #282a36;
    font-family: "Fira Code", monospace;
    font-size: 14px;
}

#input {
    margin: 10px;
    padding: 8px;
    border: none;
    border-radius: 5px;
    color: #f8f8f2;
    background-color: #44475a;
}

#inner-box {
    margin: 5px;
    background-color: #282a36;
}

#outer-box {
    margin: 5px;
    background-color: #282a36;
}

#scroll {
    margin: 5px;
}

#text {
    margin: 5px;
    color: #f8f8f2;
}

#entry {
    padding: 8px;
    border-radius: 5px;
}

#entry:selected {
    background-color: #44475a;
    border: 1px solid #bd93f9;
}

#entry > box {
    margin-left: 15px;
}

#entry image {
    margin-right: 10px;
}
```

**Что работает в итоге**

✅ Базовый tiling (окна, рабочие пространства)  
✅ Горячие клавиши для управления  
✅ Скрипты для быстрого запуска  
✅ Минималистичный статус-бар

❌ Анимации и скругления (Hyprland-style)  
❌ Нативные screenshot-утилиты

### **Мои конфиги и инструкции**

Все наработки, включая:

- Конфиги Sway и Waybar
- Скрипты для автозапуска
- Инструкцию по сборке ключевых компонентов
- Список работающих альтернатив стандартным тулзам

На сегодняшний день, в такой конфигурации я и продолжаю работать. Все отлично, проблем не испытываю.

## **Кому подойдёт РедОС, а кому — категорически нет?**

После пару месяцев использования РедОС в качестве основной системы я составил чёткий чек-лист:

### **✅ Идеальная аудитория:**

- **Офисные работники** — если ваш workflow это браузер + LibreOffice + Telegram
- **Госслужащие/бюджетники** — когда важна сертификация и "отечественное ПО"
- **Линукс-новички** — кто хочет "как в Windows, но без вирусов"
- **Владельцы старых ноутбуков** — где важна энергоэффективность и тишина

### **❌ Бегите, если вы:**

- **Разработчик** — где последняя версия Node.js/Python/Rust критична
- **Гик-кастомер** — мечтаете о Hyprland с анимациями под 165 Гц
- **Серверный админ** — нужен современный Docker/Kubernetes
- **Геймер**

### **Финал: стоит ли пробовать?**

Если вам нужно **"просто работает"** — ставьте не задумываясь.  
Если жить не можете без **кастома и свежих пакетов** — даже не тратьте время.

P.S. Все мои костыли и конфиги тут: [[gitflic.ru](https://gitflic.ru/user/konkin)] — может, вам повезёт больше чем мне!
