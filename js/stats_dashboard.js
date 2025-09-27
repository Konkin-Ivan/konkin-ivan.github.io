class StatsDashboard {
  constructor() {
    this.supabaseUrl = 'https://dqszpgwsgzemuldjrpym.supabase.co';
    this.supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxc3pwZ3dzZ3plbXVsZGpycHltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4ODM0MjAsImV4cCI6MjA3NDQ1OTQyMH0.S_q__hn56VwLxKzAqSBEQFtd5G5V4yaWsTOXdeIEaSM';
    this.supabase = supabase.createClient(this.supabaseUrl, this.supabaseKey);
    this.chart = null;
  }

