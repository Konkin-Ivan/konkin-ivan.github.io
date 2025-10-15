+++
date = '2025-10-15'
draft = false
toc = true
title = 'Архитектурный чек-лист: Функциональный пайплайн в Clojure'
description = 'Практическое руководство по рефакторингу монстр-функций в элегантные пайплайны. Четкие правила, примеры и чек-лист для поддержания кода в соответствии с принципами функционального пайплайна, единого data-bag и композиции простых функций.'
summary = 'Практическое руководство по рефакторингу монстр-функций в элегантные пайплайны. Четкие правила, примеры и чек-лист для поддержания кода в соответствии с принципами функционального пайплайна, единого data-bag и композиции простых функций.'
image = "/images/posts/pipeline-architecture/pipeline-architecture.png"  # Обложка поста
image_alt = "Архитектурный чек-лист: Функциональный пайплайн в Clojure"
tags = ["clojure"]
+++

# От монстр-функций к элегантным пайплайнам: архитектурный чек-лист

В предыдущей статье [«От монолита к модульному пайплайну»](/posts/pipeline-refactoring/) мы рассмотрели базовые принципы декомпозиции. Однако на практике возникает новая проблема: **отдельные фазы сами превращаются в монстров**.

Основная идея остается прежней — вынос логики в самостоятельные инкапсулированные фазы. Но что делать, когда эти фазы начинают разрастаться до неузнаваемости?

## **Проблема: вторичная сложность**

Допустим, вы проверили идею, подтвердили ее, но получился лютый монолит.

Допустим, вы провели рефакторинг, разбили монолит на фазы, но теперь каждая фаза похожа на монстра:
### **Фаза-монстр**
```clojure
(defn- generate-signals-phase
  "Разделенная фаза генерации торговых сигналов для уровней и боковика"
  [{:keys [price extremums level-breached? market-analysis minute-volume-analysis timestamp] :as market-data}] 
  ;; ⭐ ДОБАВЛЯЕМ timestamp в деструктуризацию
  
  (let [volume-analysis (or minute-volume-analysis {})
        volume-spike? (true? (:volume-spike? volume-analysis))
        volume-ratio (:volume-ratio volume-analysis)
        candle-history (:candles market-data)
        
        ;; ⭐ ВРЕМЕННЫЙ ФИКС: ЕСЛИ ОБЪЕМЫ НЕ РАБОТАЮТ, РАЗРЕШАЕМ УРОВНЕВУЮ ТОРГОВЛЮ
        has-volume-data? (and volume-ratio (pos? volume-ratio))
        volume-ok? (or volume-spike? (not has-volume-data?))
        
        ;; ⭐ ЗАЩИТА ОТ NIL ДЛЯ ТОРГОВОЙ ЗОНЫ
        trading-zone (:trading-zone market-analysis)
        trading-zone-name (if trading-zone (name trading-zone) "unknown")
        
        ;; 1. УСЛОВИЯ ДЛЯ УРОВНЕВОЙ ТОРГОВЛИ (ОТ УРОВНЕЙ)
        level-trading? (and (not level-breached?)
                   volume-ok?)  ;; ← УБРАЛИ ПРОВЕРКУ ТРЕНДА
        
        ;; 2. УСЛОВИЯ ДЛЯ ТОРГОВЛИ В БОКОВИКЕ (ОТ ФЛЭТА)  
        flat-trading? (and (:flat? market-analysis)
                          (get-in market-analysis [:squeeze-analysis :squeeze?])
                          volume-spike?)  ;; ← ДЛЯ БОКОВИКА СТРОГАЯ ПРОВЕРКА
        
        ;; 3. ОБЩИЕ УСЛОВИЯ ДЛЯ ЛЮБОЙ ТОРГОВЛИ
        levels-calculated? (:levels-calculated? market-data)
        can-accept-signal? (deal/can-accept-signal? price @active-order)
        
        base-conditions (and levels-calculated? can-accept-signal?)
        can-trade? (and base-conditions (or level-trading? flat-trading?))]
    
    ;; ⭐ ДЕТАЛЬНОЕ ЛОГИРОВАНИЕ БАЗОВЫХ УСЛОВИЙ
    (log/info "=== ПРОВЕРКА БАЗОВЫХ УСЛОВИЙ ===")
    (log/info "📊 Уровни рассчитаны:" levels-calculated?)
    (log/info "✅ Можно принять сигнал:" can-accept-signal?)
    (log/info "📍 Торговая зона:" trading-zone-name)
    (log/info "📈 Всплеск объема:" volume-spike? "(ratio:" volume-ratio ")")
    (log/info "📊 Есть данные объема:" has-volume-data?)
    (log/info "✅ Объем проверка:" volume-ok?)
    (log/info "💥 Сжатие:" (get-in market-analysis [:squeeze-analysis :squeeze?]))
    (log/info "🔄 Флэ�:" (:flat? market-analysis))
    
    (if can-trade?
      (let [current-levels (:active-levels @levels-state)
            ;; ⭐ ИЗМЕНЕНИЕ: ГЕНЕРИРУЕМ СИГНАЛ С СОСТОЯНИЕМ ДИВЕРГЕНЦИЙ
            raw-signal (generator/generate-trading-signal current-levels price extremums
                                  {:market-analysis market-analysis
                                   :volume-analysis volume-analysis  
                                   :candle-history candle-history
                                   :divergence-state @divergence-state})  ;; ← ПЕРЕДАЕМ СОСТОЯНИЕ
            
            ;; ⭐ ОБНОВЛЯЕМ СОСТОЯНИЕ ДИВЕРГЕНЦИЙ
            _ (when raw-signal
                (update-divergence-state (:divergences raw-signal) timestamp))
            
            ;; ⭐ ОБОГАЩАЕМ СИГНАЛ ИНФОРМАЦИЕЙ О ДИВЕРГЕНЦИЯХ
            signal (when raw-signal
                    (let [divergence-info @divergence-state
                          strong-divergence? (>= (:duration divergence-info) 2)]  ;; дивергенция сильная если длится 2+ свечи
                      
                      (assoc raw-signal
                             :divergence-memory divergence-info
                             :divergence-strong? strong-divergence?)))]
        
        (logger/log-trading-decision current-levels price nil signal)  ;; ← ПЕРЕДАЕМ nil ВМЕСТО trend
        
        ;; Обновляем кеш
        (reset! levels-cache {:timestamp (:timestamp market-data) 
                             :candle-count (:candle-count market-data)
                             :levels current-levels 
                             :extremums extremums})
        
        (when signal
          (let [signal-type (:type signal)
                trading-type (if level-trading? :level-based :flat-based)]
            (log/info "=== РАЗДЕЛЕННЫЙ ТОРГОВЫЙ СИГНАЛ ===")
            (log/info "🎯 ТИП: " (name trading-type) " | СИГНАЛ: " (name signal-type))
            (log/info "💰 Цена входа: " (format "%.2f" price))
            (log/info "📊 Зона: " trading-zone-name)
            (log/info "📈 Дивергенция: " (:active @divergence-state) 
                     " (длится " (:duration @divergence-state) " свечей)")
            
            ;; Сохраняем в кеш (убираем trend)
            (reset! last-cache {:timestamp (:timestamp market-data) 
                               :levels current-levels
                               :signal signal 
                               :trading-type trading-type})  ;; ← УБРАЛИ :trend
            
            (assoc market-data :signal signal :trading-type trading-type))))
      
      ;; ⭐ ДЕТАЛЬНОЕ ЛОГИРОВАНИЕ ПРИ ОТСУТСТВИИ СИГНАЛА
      (do
        (cond
          (not levels-calculated?)
          (log/info "⚡ Базовые условия: уровни не рассчитаны")
          
          (not can-accept-signal?)
          (log/info "⚡ Базовые условия: нельзя принять сигнал (активный ордер?)")
          
          (and (not level-trading?) (not flat-trading?))
          (do
            (log/info "⚡ Торговые условия не выполнены:")
            (when (not (and trading-zone (#{:near-support :near-resistance :internal-support :internal-resistance} trading-zone)))
              (log/info "   📍 Не в торговой зоне: " trading-zone-name))
            (when (not volume-ok?)
              (log/info "   📈 Проблема с объемом (spike:" volume-spike? "ratio:" volume-ratio ")"))
            (when (and (:flat? market-analysis) 
                      (not (get-in market-analysis [:squeeze-analysis :squeeze?])))
              (log/info "   💥 Нет сжатия в боковике"))))
        
        market-data))))
```

Это классическая проблема - фазы превращаются в "монстров". `generate-signals-phase` действительно стала слишком сложной. Подобные функции-переростки напрочь отбивают любое желание продолжать разработку и постепенно вступает во власть - ее величиство прокрестинация. Лично меня эта проблема, конкретно достала.
##  **Проблемы текущей реализации:**

1. **Слишком много ответственностей** - проверка условий, логирование, генерация сигналов, обновление состояния
2. **Высокая цикломатическая сложность** - много вложенных условий
3. **Смешение уровней абстракции** - низкоуровневая логика с бизнес-правилами
4. **Жесткие зависимости** - глобальные состояния (`@levels-state`, `@divergence-state`)

## 🔧 **Рефакторинг:**
### **1. Разделяем на специализированные фазы**
```clojure
;; Главная фаза становится тонким координатором
(defn- generate-signals-phase
  [{:keys [price market-analysis] :as market-data}]
  
  (-> market-data
      (validate-trading-conditions)    ;; ✅ отдельная фаза проверки
      (check-volume-conditions)        ;; ✅ отдельная фаза объемов  
      (generate-potential-signals)     ;; ✅ отдельная фаза генерации
      (enrich-with-divergence-info)    ;; ✅ отдельная фаза обогащения
      (log-trading-decisions)          ;; ✅ отдельная фаза логирования
      (update-system-state)))          ;; ✅ отдельная фаза состояния
```

### **2. Выносим проверку условий**
```clojure
(defn- validate-trading-conditions [{:keys [price market-analysis levels-calculated?] :as data}]
  (let [base-conditions (and levels-calculated?
                            (deal/can-accept-signal? price @active-order))
        trading-zone (:trading-zone market-analysis)
        valid-zone? (#{:near-support :near-resistance :internal-support :internal-resistance} trading-zone)]
    
    (assoc data :trading-conditions 
           {:base-conditions? base-conditions
            :valid-zone? valid-zone?
            :trading-zone trading-zone})))
```

### **3. Выносим логику объемов**
```clojure
(defn- check-volume-conditions [{:keys [minute-volume-analysis market-analysis] :as data}]
  (let [volume-analysis (or minute-volume-analysis {})
        volume-spike? (:volume-spike? volume-analysis)
        volume-ratio (:volume-ratio volume-analysis)
        has-volume-data? (and volume-ratio (pos? volume-ratio))
        
        ;; ⭐ ВЫНОСИМ БИЗНЕС-ПРАВИЛА В КОНФИГУРАЦИЮ
        level-volume-ok? (or volume-spike? (not has-volume-data?))
        flat-volume-ok? volume-spike?]
    
    (assoc data :volume-conditions
           {:level-trading? level-volume-ok?
            :flat-trading? flat-volume-ok?
            :volume-spike? volume-spike?
            :volume-ratio volume-ratio})))
```

### **4. Выносим генерацию сигналов**
```clojure
(defn- generate-potential-signals [{:keys [trading-conditions volume-conditions price extremums market-analysis] :as data}]
  (let [{:keys [base-conditions? valid-zone?]} trading-conditions
        {:keys [level-trading? flat-trading?]} volume-conditions
        
        level-signal? (and base-conditions? valid-zone? level-trading?)
        flat-signal? (and base-conditions? 
                         (:flat? market-analysis)
                         (get-in market-analysis [:squeeze-analysis :squeeze?])
                         flat-trading?)]
    
    (cond-> data
      (or level-signal? flat-signal?)
      (assoc :raw-signal (signals/generate-level-signal price extremums market-analysis)))))
```

### **5. Выносим работу с дивергенциями**
```clojure
(defn- enrich-with-divergence-info [{:keys [raw-signal timestamp] :as data}]
  (if raw-signal
    (let [divergences (:divergences raw-signal)
          _ (update-divergence-state divergences timestamp)
          divergence-info @divergence-state
          strong-divergence? (>= (:duration divergence-info) 2)]
      
      (assoc data :signal
             (-> raw-signal
                 (assoc :divergence-memory divergence-info
                        :divergence-strong? strong-divergence?))))
    data))
```

### **6. Выносим логирование**
```clojure
(defn- log-trading-decisions [{:keys [trading-conditions volume-conditions signal] :as data}]
  (let [{:keys [base-conditions? valid-zone? trading-zone]} trading-conditions
        {:keys [level-trading? flat-trading? volume-spike?]} volume-conditions]
    
    ;; Детальное логирование условий
    (log/info "=== ДЕТАЛИЗАЦИЯ УСЛОВИЙ ===")
    (log/info "📊 Базовые условия:" base-conditions?)
    (log/info "📍 Валидная зона:" valid-zone? "(зона:" trading-zone ")")
    (log/info "📈 Уровневая торговля:" level-trading?)
    (log/info "🔄 Флэт торговля:" flat-trading?)
    
    (when signal
      (let [signal-type (:type signal)
            trading-type (if level-trading? :level-based :flat-based)]
        (log/info "🎯 СГЕНЕРИРОВАН СИГНАЛ:" (name signal-type))))
    
    data))
```

## **Итоговый результат:**
```clojure
(defn- generate-signals-phase
  "Рефакторнутая фаза - тонкий координатор"
  [market-data]
  
  (-> market-data
      validate-trading-conditions     ;; → возвращает data с :trading-conditions
      check-volume-conditions         ;; → возвращает data с :volume-conditions  
      generate-potential-signals      ;; → возвращает data с :raw-signal
      enrich-with-divergence-info     ;; → возвращает data с :signal
      log-trading-decisions           ;; → логирует, возвращает data
      update-system-state))           ;; → обновляет кеши, возвращает data
```

##  **Преимущества рефакторинга:**

1. **Тестируемость** - каждую фазу можно тестировать отдельно
2. **Переиспользование** - фазы объема/условий можно использовать в других местах
3. **Читаемость** - каждая функция делает одну понятную вещь
4. **Поддержка** - легко модифицировать отдельные аспекты логики
5. **Соответствие вашим принципам** - чистый пайплайн, единый data-bag

Каждая фаза теперь следует правилу: **"получает data-bag, возвращает data-bag"** 🎯
## **Философия стиля:**
"Любая сложная проблема должна быть разбита на последовательность простых шагов,
каждый из которых умещается в голове и делает одну понятную вещь"

##  **Правило большого пальца:**
```clojure
;; ❌ ЕСЛИ функция не помещается на экране без скролла
(defn monster-function [data]
  (let [a (...
          (...
            (...)))
        b (...)
        c (...)]
    (when (...)
      (do (...)
          (...)))))

;; ✅ ОНА ДОЛЖНА стать пайплайном
(defn clean-function [data]
  (-> data
      step-one    ;; ← каждая функция простая
      step-two    ;; ← и понятная
      step-three
      step-four))
```

## **Шаблон модуля**

```clojure
(ns app.trader.module-name.core
  (:require [clojure.tools.logging :as log]))

;; ===== КОНФИГУРАЦИЯ =====
(def default-config
  {:param-1 14
   :param-2 0.02})

;; ===== ИНТЕРФЕЙСНЫЕ ФУНКЦИИ =====
(defn calc-module-from-data
  "Основная функция модуля"
  [data-bag & [config]]
  (let [full-config (merge default-config config)]
    (-> data-bag
        (prepare-data-for-module)
        (calculate-module-logic full-config)
        (format-module-result))))

;; ===== ВНУТРЕННИЕ ФУНКЦИИ =====
(defn- prepare-data-for-module [data]
  (log/info "🔧 Preparing data for module")
  (assoc data :module-data (extract-needed-data data)))

(defn- calculate-module-logic [data config]
  (log/info "🧮 Calculating module logic")
  (try
    (let [result (some-calculation (:module-data data) config)]
      (assoc data :module-result result))
    (catch Exception e
      (log/error "Module calculation failed:" e)
      nil)))

(defn- format-module-result [data]
  (log/info "📊 Formatting module result") 
  (-> data
      (assoc :final-result (:module-result data))
      (dissoc :module-data :module-result)))
```

## **ОСНОВНЫЕ ПРИНЦИПЫ:**

### **1. Архитектурный шаблон: "Функциональный пайплайн"**
```bash
ВХОД → [Фаза 1] → [Фаза 2] → [Фаза N] → ВЫХОД
```

**Правило:** ВСЕ данные проходят через пайплайн. Нет побочных эффектов между фазами.
```clojure
;; ✅ ПРАВИЛЬНО
(defn process-data [input]
  (-> input
      phase-1-clean
      phase-2-analyze
      phase-3-transform))

;; ❌ НЕПРАВИЛЬНО  
(defn process-data [input]
  (let [a (phase-1 input)
        b (phase-2 input)  ;; работаем с исходным input!
        c (phase-3 a)]
    c))
```

### **2. Структура данных: Единый Data Bag**
```clojure
;; ВСЕ данные в одной мапе
(def initial-data
  {:price-data {:open [] :high [] :close [] :low [] :volume []}
   :levels {:support nil :resistance nil}
   :indicators {:rsi [] :macd []}
   :signals {:current nil :history []}
   :context {:timestamp nil :instrument nil}})
```
**Правило:** Каждая фаза получает data-bag, возвращает data-bag.

### **3. Именование: Жесткий convention**
```txt
ТИП-ДЕЙСТВИЕ-ОБЪЕКТ-ДОПОЛНИТЕЛЬНО

ТИП: [calc-, find-, analyze-, generate-, create-]
ДЕЙСТВИЕ: [rsi, levels, signal, trend]
ОБЪЕКТ: [for-, from-, based-on-]
```
```clojure
;; ✅ ПРАВИЛЬНО
(defn calc-rsi-from-prices [prices period])
(defn find-levels-based-on-extremums [extremums])
(defn generate-signal-for-instrument [instrument-data])

;; ❌ НЕПРАВИЛЬНО
(defn rsi [p n])                    ;; непонятно
(defn find-levels [extremes])       ;; нет контекста
(defn make-signal [data])           ;; слишком абстрактно
```

### **4. Фазы пайплайна: Четкие ответственности**
```clojure
;; СТАНДАРТНЫЙ ПАЙПЛАЙН ТОРГОВОЙ СИСТЕМЫ
(def trading-pipeline
  [phase-prepare-data      ;; подготовка данных
   phase-calc-indicators   ;; индикаторы (RSI, MACD)
   phase-find-levels       ;; уровни поддержки/сопротивления  
   phase-analyze-context   ;; контекст рынка
   phase-generate-signals  ;; генерация сигналов
   phase-validate-signals  ;; валидация сигналов
   phase-execute-logic])   ;; исполнение логики
```

### **5. Обработка ошибок: Единый подход**
```clojure
;; ВСЕ функции возвращают либо data-bag, либо nil
(defn safe-phase [data]
  (try
    (if (valid-data? data)
      (do-phase-work data)
      (do (log/warn "Invalid data in phase") nil))
    (catch Exception e
      (log/error "Phase failed:" e)
      nil)))

;; В пайплайне - проверяем каждый шаг
(defn run-pipeline [initial-data pipeline]
  (reduce (fn [data phase-fn]
            (if-let [result (phase-fn data)]
              result
              (reduced nil)))  ;; останавливаем пайплайн
          initial-data
          pipeline))
```

### **6. Логирование: Стандартные форматы**
```clojure
;; ВСЕ логи в едином формате
(defn log-phase-start [phase-name data]
  (log/info "▶️ " phase-name " | data-keys:" (keys data)))

(defn log-phase-result [phase-name result]
  (if result
    (log/info "✅ " phase-name " | success")
    (log/warn "❌ " phase-name " | failed")))

(defn log-trading-signal [signal]
  (log/info "🎯 SIGNAL | type:" (:type signal) 
           " | confidence:" (:confidence signal)
           " | price:" (:price signal)))
```

## 📋 **ЧЕК-ЛИСТ ПРИ НАПИСАНИИ КОДА:**

1. Данные проходят через пайплайн?
2. Функция возвращает data-bag или nil?
3. Именование по convention?
4. Есть обработка ошибок?
5. Логирование в стандартном формате?
6. Конфигурация вынесена в default-config?
7. Внутренние функции приватные?

## 💎 Заключение

Описанный подход — это не просто стиль кодирования, а **единая система разработки**, которую я применяю во всех проектах. Она позволяет:

### Преимущества:
- **Стандартизировать процесс** — больше не нужно каждый раз решать, какие данные куда передавать
- **Снизить когнитивную нагрузку** — архитектурные решения уже приняты, остается только следовать правилам
- **Ускорить разработку** — четкий протокол для любой функциональности

###  Главный принцип:
```clojure
;; Когда не знаешь как сделать - смотри style guide
(when (not-understand-how-to-implement? task)
  (read-style-guide-and-follow-rules))
