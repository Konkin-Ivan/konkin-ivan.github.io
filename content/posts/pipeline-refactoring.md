+++
date = '2025-09-24'
draft = false
toc = true
title = 'Архитектурная эволюция торговой системы: от монолита к модульному пайплайну'
description = 'Настал день, когда нужно было добавить анализ свечных паттернов. Я открыл код и понял — **это очень сложно**. Нужно прилагать усилия, чтобы вникнуть в обстановку и понять куда внедрить новое.'
summary = 'Настал день, когда нужно было добавить анализ свечных паттернов. Я открыл код и понял — **это очень сложно**. Нужно прилагать усилия, чтобы вникнуть в обстановку и понять куда внедрить новое.'
image = "/images/posts/strategies/pipeline.png"  # Обложка поста
image_alt = "Архитектурная эволюция торговой системы: от монолита к модульному пайплайну"
tags = ["clojure", "алготрейдинг"]
+++

# Архитектурная эволюция торговой системы: от монолита к модульному пайплайну

## Как моя функция превратилась в Франкенштейна и что я с этим сделал

![Рефакторинг по принципу пайплайн](/images/posts/strategies/pipeline.png)

Жил-был у меня код. Простой такой, милый:
```clojure
(defn generate-signal [candles price]
  (let [levels (calculate-levels candles)
        trend (detect-trend candles)]
    (if (> price (:level levels))
      :buy
      :hold)))
```

Жил не тупил, сигналы генерировал. Но потом пошло-поехало...

## Как я своего монстра создавал

Сначала добавил проверку пробития уровней:
```clojure
;; Окей, добавим мониторинг пробитий...
(let [level-status (monitor-breakthroughs price levels)])
```

Потом понадобился анализ объема:
```clojure
;; А Volume глянем, вдруг там дивергенция...
(let [volume-analysis (analyze-volume candles)])
```

Затем virtual levels подъехали:
```clojure
;; Тут еще виртуальные уровни проверить надо...
(let [virtual-levels (validate-virtual-levels price levels)])
```

И понеслась... Функция раздулась до 50+ строк, вложенных условий, и я сам перестал понимать, что где происходит.
```clojure
(defn generate-signal
  [candle-history current-price]
  (let [ordered-candles (if (> (:time (first candle-history))
                               (:time (last candle-history)))
                          (reverse candle-history)
                          candle-history)
        price (:close (last current-price))
        last-timestamp (:time (last candle-history))
        candle-count (count candle-history)]
    
    (log/info "Тайм Штамп свечи:" last-timestamp)
    
    (when (should-recalculate-levels? ordered-candles)
      (let [extremums (trend-detector/find-extremums ordered-candles)
            levels (aggregate-candles ordered-candles price DEFAULT-CONFIG)
            trend (trend-detector/determine-trend extremums price DEFAULT-CONFIG)]
        
        ;; 1. ОБНОВЛЯЕМ АТОМЫ с новыми уровнями (СНАЧАЛА!)
        (swap! levels-state assoc :active-levels levels)
        
        ;; 2. BRAIN: мониторинг пробитий (ПОТОМ мониторим)
        (let [level-status (smart/monitor-level-breakthrough price levels-state)
              
              ;; 3. ВАЛИДАЦИЯ ВИРТУАЛЬНЫХ УРОВНЕЙ (после мониторинга)
              validation-result (smart/validate-virtual-levels price levels-state candle-history)]
          
          (when (:virtual-validation? validation-result)
            (log/info "✅ Виртуальный уровень подтвержден! Обновляем состояние..."))
          
          ;; 4. УМНЫЙ ПЕРЕСЧЕТ (если уровень пробит)
          (when-let [recalc-type (smart/recalculation-needed? levels-state)]
            (case recalc-type
              :recalculate-support 
              (do
                (log/info "🔄 Выполняем пересчет поддержки")
                (let [updated-levels (smart/recalculate-support-level levels ordered-candles price)]
                  (swap! levels-state assoc :active-levels updated-levels)
                  (log/info "✅ Поддержка пересчитана")))
              
              :recalculate-resistance 
              (do
                (log/info "🔄 Выполняем пересчет сопротивления")
                (let [updated-levels (smart/recalculate-resistance-level levels ordered-candles price)]
                  (swap! levels-state assoc :active-levels updated-levels)
                  (log/info "✅ Сопротивление пересчитана")))
              
              nil))
          
          ;; 5. Если уровень пробит - НЕ генерируем сигналы
          (if (:level-breached? level-status)
            (do
              (log/info "🔴 Уровень пробит, пропускаем генерацию сигналов")
              (reset! levels-cache {:timestamp last-timestamp,
                                    :candle-count candle-count,
                                    :levels levels,
                                    :extremums extremums})
              nil)
            
            ;; 6. FAST КОНТУР: генерация сигналов
            (let [current-levels (:active-levels @levels-state)
                  signal (signal-generator current-levels price trend extremums)]
              
              (reset! levels-cache {:timestamp last-timestamp,
                                    :candle-count candle-count,
                                    :levels current-levels,
                                    :extremums extremums})
              
              (when signal
                (let [signal-type (:type signal)]
                  (when (#{:buy :sell} signal-type)
                    (log/info "🎯 GENERATED TRADING SIGNAL: " signal-type
                              "в тренде:" (name trend))
                    (let [{:keys [support resistance]} (:levels signal)
                          params {:risk-reward-ratio 2.0,
                                  :support-level (:level support),
                                  :resistance-level (:level resistance),
                                  :current-levels (:levels signal),
                                  :trend trend,
                                  :extremums extremums}]
                      (reset! last-cache {:timestamp last-timestamp,
                                          :levels current-levels,
                                          :signal (assoc signal :params params),
                                          :trend trend})
                      (assoc signal :params params))))))))))))
```

## Момент истины

Настал день, когда нужно было добавить анализ свечных паттернов. Я открыл код и понял — **это очень сложно**. Нужно прилагать усилия, чтобы вникнуть в обстановку и понять куда внедрить новое.

Вот что на самом деле происходило в коде (хоть это и было скрыто в хаосе):
```bash
[Уровни] → [Мониторинг] → [Валидация] → [Анализ] → [Сигналы] → [Кеширование]
```

И все в одной функции! Как в той шутке: "Я не программист, я сборщик кода методом копипасты".

## Что попробовал сделать

**Попытка 1: Разделить по смыслу**
```clojure
;; Просто вынес куски в отдельные функции
(defn prepare-data [candles price] ...)
(defn calculate-levels [data] ...)
(defn monitor-breakthroughs [data] ...)
```

Стало чуть лучше, но все равно каша.

**Попытка 2: Сделать как умные ребята советуют**
```clojure
;; Начитался статей, сделал "правильно"
(defmulti process-phase :phase)
(defmethod process-phase :calculation [state] ...)
```

Получилось красиво, но я сам через неделю не мог понять, как это работает. Выкинул.

**Попытка 3: Как заядлый Линуксоид**
```clojure
;; Просто последовательность шагов
(defn process-tick [candles price]
  (-> {:candles candles :price price}
      prepare-data
      find-levels
      check-breakthroughs  
      analyze-patterns
      generate-signal))
```

И вот это сработало! Каждый шаг делает одну понятную вещь, добавить новый функционал — просто вставить еще один шаг в цепочку.

Вместо того чтобы городить сложные архитектуры, просто сделал как в bash:
```bash
cat data | prepare | analyze | filter | generate_signal
```

Только на Clojure это выглядит еще элегантнее:
```clojure
(defn process-tick [candles price]
  (-> {:candles candles :price price}  ;; <- как будто cat data
      prepare-data                     ;; <- подготовка
      find-levels                      ;; <- поиск уровней  
      check-breakthroughs              ;; <- мониторинг пробитий
      analyze-patterns                 ;; <- анализ паттернов
      generate-signal))                ;; <- финальный результат
```

**Почему пайплайн — это мне было известно:**

1. **вместо сложных интерфейсов** — каждый шаг принимает данные и возвращает данные, никаких скрытых состояний
2. **Можно легко дебажить** — вставляешь `tap>` между шагами как будто `tee` в конвейере
3. **Простота добавления нового функционала** — хочешь добавить анализ объема? Просто вставляешь еще один шаг:
```clojure
(-> data
    prepare-data
    find-levels
    check-breakthroughs
    analyze-volume     ;; <- новый шаг, вставил за 2 секунды
    analyze-patterns
    generate-signal)
```

1. **Логично для торговли** — ведь анализ рынка это и есть последовательность шагов: данные → уровни → пробития → сигнал

И главное — никакой магии. Открываешь код через месяц и сразу видишь всю цепочку преобразований. Не нужно вспоминать, какие там были состояния или фазы — просто читаешь сверху вниз, как книгу.

Финальный вариант:
```clojure
;; ===== ОСНОВНОЙ PIPELINE =====
(defn generate-signal
  [candle-history current-price]
  (let [pipeline [prepare-market-data
                  calculate-levels-phase     ;; 1. Расчет уровней
                  monitor-levels-phase       ;; 2. Мониторинг пробитий  
                  market-analysis-phase      ;; 3. Анализ рынка (флэт/сжатие)
                  minute-volume-analysis-phase  ;; ← НОВАЯ ФАЗА: минутный объем!
                  smart-recalculation-phase  ;; 4. Пересчет
                  generate-signals-phase     ;; 5. Генерация сигналов
                  update-cache-phase]        ;; 6. Кеширование
        
        initial-data {:candle-history candle-history :current-price current-price}]
    
    (try
      (let [result (reduce (fn [data phase-fn]
                            (if-let [result (phase-fn data)]
                              result
                              (reduced nil)))
                          initial-data
                          pipeline)]
        
        (:signal result))
      
      (catch Exception e
        (log/error "Ошибка в торговом пайплайне:" e)
        nil))))
```

## Разбор пайплайна

### 1. `pipeline` — это не массив переменных, а **вектор функций**
```clojure
pipeline [prepare-market-data        ;; <- это функция!
          calculate-levels-phase     ;; <- и это функция!
          monitor-levels-phase]      ;; <- и это тоже функция!
```

Каждая из этих функций определена выше, например:
```clojure
(defn prepare-market-data [{:keys [candle-history current-price]}]
  ;; ... логика подготовки
  {:candles ordered-candles :price price})  ;; возвращает данные для следующей фазы

(defn calculate-levels-phase [{:keys [candles price] :as data}]
  ;; ... расчёт уровней  
  (assoc data :levels calculated-levels))  ;; добавляет уровни к данным
```

### 2. `reduce` — это конвейерная лента

Представь себе заводской конвейер:
```clojure
(reduce (fn [data phase-fn] (phase-fn data))  ;; ← рабочий на конвейере
        initial-data                          ;; ← сырьё в начале ленты  
        pipeline)                             ;; ← последовательность операций
```

**Как это работает пошагово:**

1. **Начало:** `initial-data = {:candle-history [...], :current-price [...]}`
2. **Шаг 1:** `(prepare-market-data initial-data)` → возвращает `{:candles [...], :price 43.77, ...}`
3. **Шаг 2:** `(calculate-levels-phase результат-шага-1)` → возвращает данные + `:levels`
4. **Шаг 3:** `(monitor-levels-phase результат-шага-2)` → возвращает данные + `:level-status`
5. **... и так далее по всему пайплайну**

### 3. `reduced` — аварийный останов
```clojure
(fn [data phase-fn]
  (if-let [result (phase-fn data)]  ;; пробуем выполнить фазу
    result                          ;; если получилось — идём дальше
    (reduced nil)))                 ;; если фаза вернула nil — останавливаем конвейер
```

Это как аварийная кнопка на конвейере. Если какая-то фаза возвращает `nil` (например, данные невалидные), пайплайн останавливается и сразу возвращает `nil`.

### 4. Всё вместе — это преобразование данных

**На входе:** сырые свечи и цена
```clojure
{:candle-history [...], :current-price [...]}
```

**На выходе:** готовый торговый сигнал (или `nil`)
```clojure
{:type :buy, :params {...}, :levels {...}}
```

**Что происходит внутри:**
```bash
Сырые данные 
→ prepare-market-data (упорядочивание свечей) 
→ calculate-levels-phase (расчёт уровней поддержки/сопротивления) 
→ monitor-levels-phase (проверка пробитий уровней)
→ ... и т.д.
→ generate-signals-phase (генерация сигнала buy/sell)
```

Тоесть, результат работы предыдущей функции передается следующей.

## Почему это круто

1. **Видна вся логика** — просто читаешь вектор `pipeline` и понимаешь последовательность
2. **Легко менять** — хочешь добавить анализ объема? Просто вставляешь функцию в вектор
3. **Легко дебажить** — можно пройти пайплайн пошагово
4. **Каждая функция простая** — делает одну конкретную вещь

По сути, это функциональный аналог UNIX pipe: `cat data | prepare | analyze | generate`, только типобезопасный и на Clojure.

## Почему Clojure идеально подходит для пайплайнов

Самое красивое в этом всём — то, что **Clojure буквально создан для таких пайплайнов**. В отличие от императивных языков, где ты постоянно мучаешься с промежуточными переменными и побочными эффектами, в Clojure пайплайн выглядит как естественный поток данных.

Возьмём тот же пример на Python (условно):
```clojure
def generate_signal(candle_history, current_price):
    data = prepare_market_data(candle_history, current_price)  # шаг 1
    data = calculate_levels_phase(data)                        # шаг 2  
    data = monitor_levels_phase(data)                          # шаг 3
    # ... и так 7 раз с повторяющимся присваиванием
    return data['signal']
```

А в Clojure благодаря threading macro `->` это выглядит элегантно:
```clojure
(-> {:candle-history candle-history :current-price current-price}
    prepare-market-data
    calculate-levels-phase
    monitor-levels-phase
    ;; ... и ещё 4 фазы без лишнего шума
    :signal)
```

**Что даёт такой подход на практике:**

1. **Неизменяемые данные** — каждая фаза получает данные, возвращает новые данные, не ломая исходные. Можно спокойно дебажить каждый шаг.
2. **Композируемость** — функции как кубики Лего. Хочешь добавить анализ VWAP? Просто вставляешь ещё один "кубик" в пайплайн.
3. **Прозрачность** — видишь всю бизнес-логику как на ладони. Не нужно прыгать по классам и интерфейсам.

И самое главное — **это идиоматично для Clojure**. Threading macros (`->`, `->>`) это не какая-то магия, а базовая конструкция языка. Когда пишешь на Clojure, ты просто думаешь в терминах "данные проходят через серию преобразований" — и код естественным образом получается в виде пайплайна.

По сути, я не придумал ничего нового — просто использовал язык так, как он и задумывался. И это оказалось самым эффективным решением.