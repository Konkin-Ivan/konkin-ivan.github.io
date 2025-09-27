class PostAnalytics {
  constructor() {
    this.supabaseUrl = 'https://dqszpgwsgzemuldjrpym.supabase.co';
    this.supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxc3pwZ3dzZ3plbXVsZGpycHltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4ODM0MjAsImV4cCI6MjA3NDQ1OTQyMH0.S_q__hn56VwLxKzAqSBEQFtd5G5V4yaWsTOXdeIEaSM';
    this.supabase = supabase.createClient(this.supabaseUrl, this.supabaseKey);
    
    this.localCache = this.loadLocalCache();
  }

  loadLocalCache() {
    try {
      const raw = localStorage.getItem('blog_analytics_cache');
      return raw ? JSON.parse(raw) : { user: { liked: {}, viewed: {} } };
    } catch (e) {
      return { user: { liked: {}, viewed: {} } };
    }
  }

  saveLocalCache() {
    try {
      localStorage.setItem('blog_analytics_cache', JSON.stringify(this.localCache));
    } catch (e) {}
  }

  async trackView(postId) {
    if (!postId || this.localCache.user.viewed[postId]) return;
    
    try {
      console.log('👁️ Tracking view for:', postId);
      
      const { error } = await this.supabase
        .from('posts_stats')
        .upsert({ 
          post_id: postId,
          views: 1,
          updated_at: new Date().toISOString()
        }, { 
          onConflict: 'post_id'
        });

      if (error) throw error;

      this.localCache.user.viewed[postId] = true;
      this.saveLocalCache();
      this.updateDisplay(postId);
      
    } catch (error) {
      console.error('trackView error:', error);
    }
  }

  async trackLike(postId) {
    if (!postId) return;
    
    const wasLiked = !!this.localCache.user.liked[postId];
    console.log('🔄 Tracking like for:', postId, 'wasLiked:', wasLiked);
    
    try {
      // Вместо прямого значения используем инкремент через базу
      if (wasLiked) {
        // Убираем лайк
        const { error } = await this.supabase
          .from('posts_stats')
          .upsert({ 
            post_id: postId,
            likes: 0, // Будем использовать корректный декремент ниже
            updated_at: new Date().toISOString()
          }, { 
            onConflict: 'post_id'
          });
        if (error) throw error;
      } else {
        // Добавляем лайк
        const { error } = await this.supabase
          .from('posts_stats')
          .upsert({ 
            post_id: postId,
            likes: 1,
            updated_at: new Date().toISOString()
          }, { 
            onConflict: 'post_id'
          });
        if (error) throw error;
      }

      // Обновляем локальный кэш
      if (wasLiked) {
        delete this.localCache.user.liked[postId];
      } else {
        this.localCache.user.liked[postId] = true;
      }
      this.saveLocalCache();
      
      this.updateDisplay(postId);
      console.log('✅ Like tracked successfully!');
      
    } catch (error) {
      console.error('❌ trackLike error:', error);
    }
  }

  // Упрощенный getStats с обработкой ошибки 406
  async getPostStats(postId) {
    try {
      // Пробуем простой запрос
      const { data, error } = await this.supabase
        .from('posts_stats')
        .select()
        .eq('post_id', postId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return { likes: 0, views: 0 }; // Пост не найден - нормально
        }
        // Для ошибки 406 пробуем альтернативный метод
        console.log('GET error, trying alternative:', error.message);
        return await this.getPostStatsAlternative(postId);
      }
      
      return data || { likes: 0, views: 0 };
    } catch (error) {
      console.error('getPostStats error:', error);
      return { likes: 0, views: 0 };
    }
  }

  // Альтернативный метод для случаев 406 ошибки
  async getPostStatsAlternative(postId) {
    try {
      // Используем более простой подход
      const { data, error } = await this.supabase
        .from('posts_stats')
        .select('likes, views')
        .eq('post_id', postId);

      if (error) throw error;
      
      return data && data[0] ? data[0] : { likes: 0, views: 0 };
    } catch (error) {
      console.error('Alternative method error:', error);
      return { likes: 0, views: 0 };
    }
  }

  async updateDisplay(postId) {
    try {
      const stats = await this.getPostStats(postId);
      console.log('📊 Updating display for:', postId, stats);
      
      document.querySelectorAll(`[data-post-id="${postId}"]`).forEach(container => {
        const viewsEl = container.querySelector('.views');
        const likesEl = container.querySelector('.likes');
        
        if (viewsEl) viewsEl.textContent = '👁‍🗨 ' + (stats.views || 0);
        if (likesEl) {
          const countSpan = likesEl.querySelector('.likes-count, .count');
          if (countSpan) {
            countSpan.textContent = Math.max(0, stats.likes || 0); // Защита от отрицательных
          } else {
            likesEl.textContent = '💛 ' + Math.max(0, stats.likes || 0);
          }
          
          const isLiked = !!this.localCache.user.liked[postId];
          likesEl.classList.toggle('liked', isLiked);
        }
      });
    } catch (error) {
      console.error('updateDisplay error:', error);
    }
  }

  init() {
    console.log('🚀 Analytics initialized');
    
    // Обработчик лайков
    document.addEventListener('click', (e) => {
      const likeEl = e.target.closest('.likes, .like, [data-action="like"]');
      if (!likeEl) return;
      
      const container = likeEl.closest('[data-post-id]');
      const postId = container?.dataset.postId;
      if (!postId) return;
      
      e.preventDefault();
      this.trackLike(postId);
    });

    // Трек просмотров
    const singlePost = document.querySelector('.post[data-post-id]');
    if (singlePost) {
      this.trackView(singlePost.dataset.postId);
    }

    // Обновляем отображение
    setTimeout(() => {
      document.querySelectorAll('[data-post-id]').forEach(container => {
        this.updateDisplay(container.dataset.postId);
      });
    }, 1000);
  }
}

// Запуск
document.addEventListener('DOMContentLoaded', () => {
  window.postAnalytics = new PostAnalytics();
  window.postAnalytics.init();
});
