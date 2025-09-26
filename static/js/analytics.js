class PostAnalytics {
  constructor() {
    this.supabaseUrl = 'https://dqszpgwsgzemuldjrpym.supabase.co';
    this.supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxc3pwZ3dzZ3plbXVsZGpycHltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4ODM0MjAsImV4cCI6MjA3NDQ1OTQyMH0.S_q__hn56VwLxKzAqSBEQFtd5G5V4yaWsTOXdeIEaSM';
    this.supabase = supabase.createClient(this.supabaseUrl, this.supabaseKey);
    
    // Локальный кэш для быстрого отображения
    this.localCache = this.loadLocalCache();
    this.isOnline = true;
  }

  // Загружаем локальный кэш (как раньше, но только для пользовательских действий)
  loadLocalCache() {
    try {
      const raw = localStorage.getItem('blog_analytics_cache');
      if (!raw) return { user: { liked: {}, viewed: {} } };
      const parsed = JSON.parse(raw);
      return {
        user: {
          liked: parsed.user?.liked || {},
          viewed: parsed.user?.viewed || {}
        }
      };
    } catch (e) {
      return { user: { liked: {}, viewed: {} } };
    }
  }

  saveLocalCache() {
    try {
      localStorage.setItem('blog_analytics_cache', JSON.stringify(this.localCache));
    } catch (e) {
      console.error('PostAnalytics: saveLocalCache error', e);
    }
  }

  // Основные методы с Supabase
  async trackView(postId) {
    if (!postId) return;
    
    const id = String(postId);
    
    // Проверяем, не просматривал ли пользователь уже этот пост
    if (this.localCache.user.viewed[id]) return;
    
    try {
      // Увеличиваем просмотры в Supabase
      const { data, error } = await this.supabase
        .rpc('increment_views', { post_id: id });
      
      if (error) throw error;
      
      // Сохраняем в локальный кэш
      this.localCache.user.viewed[id] = true;
      this.saveLocalCache();
      
      this.updateAll(id);
    } catch (error) {
      console.error('PostAnalytics: trackView error', error);
      this.isOnline = false;
    }
  }

  async trackLike(postId) {
    if (!postId) return;
    
    const id = String(postId);
    const wasLiked = !!this.localCache.user.liked[id];
    
    try {
      let result;
      
      if (wasLiked) {
        // Убираем лайк
        result = await this.supabase
          .rpc('decrement_likes', { post_id: id });
        delete this.localCache.user.liked[id];
      } else {
        // Добавляем лайк
        result = await this.supabase
          .rpc('increment_likes', { post_id: id });
        this.localCache.user.liked[id] = true;
      }
      
      if (result.error) throw result.error;
      
      this.saveLocalCache();
      this.updateAll(id);
    } catch (error) {
      console.error('PostAnalytics: trackLike error', error);
      this.isOnline = false;
    }
  }

  async getPostStats(postId) {
    const id = String(postId);
    
    try {
      const { data, error } = await this.supabase
        .from('posts_stats')
        .select('likes, views')
        .eq('post_id', id)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned
      
      return data || { likes: 0, views: 0 };
    } catch (error) {
      console.error('PostAnalytics: getPostStats error', error);
      return { likes: 0, views: 0 };
    }
  }

  async updateAll(postId) {
    const id = String(postId);
    const stats = await this.getPostStats(id);
    
    document.querySelectorAll(`[data-post-id="${id}"]`).forEach(container => {
      const viewsEl = container.querySelector('.views');
      const likesEl = container.querySelector('.likes');
      
      if (viewsEl) viewsEl.textContent = '👁‍🗨 ' + (stats.views || 0);
      if (likesEl) {
        const countSpan = likesEl.querySelector('.likes-count, .count');
        if (countSpan) countSpan.textContent = (stats.likes || 0);
        else likesEl.textContent = '💛 ' + (stats.likes || 0);
        
        const isLiked = !!this.localCache.user.liked[id];
        likesEl.classList.toggle('liked', isLiked);
        likesEl.setAttribute('aria-pressed', isLiked);
      }
    });
  }

  async init() {
    // Инициализация отображения для всех постов
    const postContainers = document.querySelectorAll('[data-post-id]');
    const postIds = [...new Set(Array.from(postContainers).map(el => el.dataset.postId))];
    
    // Загружаем статистику для всех постов
    for (const postId of postIds) {
      await this.updateAll(postId);
    }

    // Делегированный обработчик для лайков (остаётся таким же)
    document.addEventListener('click', (e) => {
      const likeEl = e.target.closest('.likes, .like, [data-action="like"]');
      if (!likeEl) return;
      
      const container = likeEl.closest('[data-post-id], .post-card');
      const postId = container ? (container.getAttribute('data-post-id') || container.dataset.postId) : null;
      if (!postId) return;
      
      e.preventDefault();
      this.trackLike(postId);
    });

    // Track view for single post page
    const single = document.querySelector('.post[data-post-id]');
    if (single) this.trackView(single.dataset.postId);
  }
}

// Инициализация
document.addEventListener('DOMContentLoaded', async () => {
  // Ждём загрузки Supabase JS
  if (typeof supabase === 'undefined') {
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/@supabase/supabase-js@2';
    document.head.appendChild(script);
    
    script.onload = () => {
      window.postAnalytics = new PostAnalytics();
      window.postAnalytics.init();
    };
  } else {
    window.postAnalytics = new PostAnalytics();
    window.postAnalytics.init();
  }
});
