---
title: "Примеры на Clojure"
date: 2024-05-20
description: "Демонстрация Clojure кода с подсветкой синтаксиса"
tags: ["clojure", "functional", "lisp"]
---

## Базовые примеры

### Функции высшего порядка
```clojure
(defn square [x] 
  (* x x))

(defn process-numbers [numbers]
  (->> numbers
       (filter odd?)
       (map square)
       (reduce +)))

;; Использование
(process-numbers [1 2 3 4 5 6 7 8 9 10])
;; => 165
```

### Макросы
```clojure
(defmacro unless [condition & body]
  `(if (not ~condition)
     (do ~@body)))

;; Пример использования
(unless (> 10 20)
  (println "10 не больше 20")
  (+ 10 20))
```

### Работа с коллекциями
```clojure
(def user-data
  [{:name "Alice" :age 30 :role :admin}
   {:name "Bob" :age 25 :role :user}
   {:name "Charlie" :age 35 :role :moderator}])

;; Трансдьюсеры
(transduce
  (comp
    (filter #(> (:age %) 25))
    (map :name))
  conj
  user-data)
;; => ["Alice" "Charlie"]
```

### Core.async пример
```clojure
(ns async-example
  (:require [clojure.core.async :as a :refer [go <! >! chan]]))

(defn async-process [data]
  (go
    (let [result (<! (fetch-data data))]
      (when (:valid? result)
        (>! (process-chan) result)))))
```

## Особенности подсветки

- **Keywords** (`:like-this`) выделяются цветом
- **Symbols** и функции различаются
- **Скобки** сохраняют читаемость
- **Комментарии** не отвлекают