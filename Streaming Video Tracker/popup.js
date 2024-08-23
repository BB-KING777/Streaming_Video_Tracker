// popup.js
function formatDuration(seconds) {
  if (isNaN(seconds) || seconds === 0) return "不明";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}時間 ${minutes}分`;
}

function getGenreJapanese(genre) {
  switch (genre) {
    case 'movie': return '映画';
    case 'drama': return 'ドラマ';
    case 'anime': return 'アニメ';
    case 'other': return 'その他';
    default: return '未設定';
  }
}

function updateVideoList() {
  chrome.storage.local.get('videos', function(data) {
    if (chrome.runtime.lastError) {
      console.error('Error fetching data:', chrome.runtime.lastError);
      document.getElementById('videoList').innerHTML = '<p>データの取得中にエラーが発生しました。</p>';
      return;
    }
    const videoList = document.getElementById('videoList');
    videoList.innerHTML = '';
    const videos = data.videos || [];
    videos.sort((a, b) => new Date(b.lastUpdated) - new Date(a.lastUpdated));
    videos.slice(0, 5).forEach(function(video) {  // 最新の5件のみ表示
      const div = document.createElement('div');
      div.className = 'video-item';
      const displayTitle = video.episodeTitle ? `${video.mainTitle} - ${video.episodeTitle}` : video.mainTitle;
      div.innerHTML = `
        <div class="video-title">${displayTitle}</div>
        <div class="video-info">
          <p>サービス: ${video.service}</p>
          <p>ジャンル: ${getGenreJapanese(video.genre)}</p>
          <p>状態: ${video.status === 'completed' ? '視聴完了' : (video.status === 'in progress' ? '視聴中' : '不明')}</p>
          <p>視聴時間: ${formatDuration(video.watchedDuration)} / ${formatDuration(video.totalDuration)}</p>
          <p>最終更新: ${new Date(video.lastUpdated).toLocaleString('ja-JP')}</p>
          <p>評価: ${'★'.repeat(video.rating || 0)}</p>
        </div>
      `;
      videoList.appendChild(div);
    });
  });
}

function updateStats() {
  chrome.storage.local.get('videos', function(data) {
    const stats = document.getElementById('stats');
    const videos = data.videos || [];
    const totalWatched = videos.reduce((sum, video) => sum + (video.watchedDuration || 0), 0);
    const completedCount = videos.filter(v => v.status === 'completed').length;
    
    stats.innerHTML = `
      <p>総視聴時間: ${formatDuration(totalWatched)}</p>
      <p>視聴完了作品数: ${completedCount}</p>
    `;
  });
}

document.addEventListener('DOMContentLoaded', function() {
  updateVideoList();
  updateStats();

  document.getElementById('manage-button').addEventListener('click', function() {
    chrome.tabs.create({url: 'manage.html'});
  });

  document.getElementById('rate-button').addEventListener('click', function() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {action: "showRatingPopup"}, function(response) {
        if (chrome.runtime.lastError) {
          console.error(chrome.runtime.lastError);
        } else if (response && response.success) {
          window.close(); // ポップアップを閉じる
        }
      });
    });
  });
});

setInterval(() => {
  updateVideoList();
  updateStats();
}, 30000);