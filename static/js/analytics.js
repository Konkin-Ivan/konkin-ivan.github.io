class PostAnalytics {
  constructor() {
    this.storageKey = 'blog_analytics';
    this.data = this.loadData(); // гарантированно { posts:{}, user:{ liked:{}, viewed:{} } }
  }

  loadData() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return { posts: {}, user: { liked: {}, viewed: {} } };
      const parsed = JSON.parse(raw);
      // Нормализуем структуру на случай повреждённых данных
      if (!parsed || typeof parsed !== 'object') return { posts: {}, user: { liked: {}, viewed: {} } };
      parsed.posts = parsed.posts && typeof parsed.posts === 'object' ? parsed.posts : {};
      parsed.user = parsed.user && typeof parsed.user === 'object' ? parsed.user : { liked: {}, viewed: {} };
      parsed.user.liked = parsed.user.liked && typeof parsed.user.liked === 'object' ? parsed.user.liked : {};
      parsed.user.viewed = parsed.user.viewed && typeof parsed.user.viewed === 'object' ? parsed.user.viewed : {};
      return parsed;
    } catch (e) {
      console.error('PostAnalytics: loadData parse error', e);
      return { posts: {}, user: { liked: {}, viewed: {} } };
    }
  }

  saveData() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.data));
    } catch (e) {
      console.error('PostAnalytics: saveData error', e);
    }
  }

  ensurePost(postId) {
    if (!postId && postId !== 0) { // null/undefined check
      console.warn('ensurePost: invalid postId', postId);
      return false;
    }
    const id = String(postId);
    // защита: если this.data или this.data.posts вдруг не объект — восстановим
    if (!this.data || typeof this.data !== 'object') this.data = { posts: {}, user: { liked: {}, viewed: {} } };
    if (!this.data.posts || typeof this.data.posts !== 'object') this.data.posts = {};
    if (!this.data.posts[id]) this.data.posts[id] = { views: 0, likes: 0 };
    return true;
  }

  trackView(postId) {
    if (!this.ensurePost(postId)) return;
    const id = String(postId);
    if (this.data.user.viewed && this.data.user.viewed[id]) return;
    this.data.posts[id].views++;
    if (!this.data.user) this.data.user = { liked: {}, viewed: {} };
    if (!this.data.user.viewed || typeof this.data.user.viewed !== 'object') this.data.user.viewed = {};
    this.data.user.viewed[id] = true;
    this.saveData();
    this.updateAll(id);
  }

  trackLike(postId) {
    if (!this.ensurePost(postId)) return;
    const id = String(postId);
    if (!this.data.user) this.data.user = { liked: {}, viewed: {} };
    if (!this.data.user.liked || typeof this.data.user.liked !== 'object') this.data.user.liked = {};
    const liked = !!this.data.user.liked[id];
    if (liked) {
      this.data.posts[id].likes = Math.max(0, (this.data.posts[id].likes || 0) - 1);
      delete this.data.user.liked[id];
    } else {
      this.data.posts[id].likes = (this.data.posts[id].likes || 0) + 1;
      this.data.user.liked[id] = true;
    }
    this.saveData();
    this.updateAll(id);
  }

  updateAll(id) {
    const idStr = String(id);
    const post = (this.data.posts && this.data.posts[idStr]) ? this.data.posts[idStr] : { views: 0, likes: 0 };
    // обновляем все контейнеры с точным совпадением data-post-id
    document.querySelectorAll(`[data-post-id]`).forEach(container => {
      if (String(container.dataset.postId) !== idStr) return;
      const viewsEl = container.querySelector('.views');
      const likesEl = container.querySelector('.likes');
      if (viewsEl) viewsEl.textContent = '👁‍🗨 ' + (post.views || 0);
      if (likesEl) {
        const countSpan = likesEl.querySelector('.likes-count, .count');
        if (countSpan) countSpan.textContent = (post.likes || 0);
        else likesEl.textContent = '💛 ' + (post.likes || 0);
        likesEl.classList.toggle('liked', !!(this.data.user && this.data.user.liked && this.data.user.liked[idStr]));
        likesEl.setAttribute('aria-pressed', !!(this.data.user && this.data.user.liked && this.data.user.liked[idStr]));
      }
    });
  }

  init() {
    // Нормализуем данные при старте
    if (!this.data || typeof this.data !== 'object') this.data = { posts: {}, user: { liked: {}, viewed: {} } };
    if (!this.data.posts || typeof this.data.posts !== 'object') this.data.posts = {};
    if (!this.data.user || typeof this.data.user !== 'object') this.data.user = { liked: {}, viewed: {} };

    // Инициализация отображения для всех элементов с data-post-id
    document.querySelectorAll('[data-post-id]').forEach(container => {
      const pid = container.dataset.postId;
      if (!pid) return;
      this.ensurePost(pid);
      this.updateAll(pid);
    });

    // Делегированный обработчик для лайков
    document.addEventListener('click', (e) => {
      const likeEl = e.target.closest('.likes, .like, [data-action="like"]');
      if (!likeEl) return;
      const container = likeEl.closest('[data-post-id], .post-card');
      const postId = container ? (container.getAttribute('data-post-id') || container.dataset.postId) : null;
      if (!postId) return console.warn('PostAnalytics: postId not found for like click', { likeEl, container });
      e.preventDefault();
      this.trackLike(postId);
    });

    // Track view for single post page
    const single = document.querySelector('.post[data-post-id]');
    if (single) this.trackView(single.dataset.postId);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.postAnalytics = new PostAnalytics();
  window.postAnalytics.init();
});
