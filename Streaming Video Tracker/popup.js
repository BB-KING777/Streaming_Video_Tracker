// ビデオの視聴時間をフォーマットする関数
function formatDuration(seconds) {
  if (isNaN(seconds) || seconds === 0) return "不明";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}時間 ${minutes}分`;
}

// ジャンルを日本語に変換する関数
function getGenreJapanese(genre) {
  switch (genre) {
    case 'movie': return '映画';
    case 'drama': return 'ドラマ';
    case 'anime': return 'アニメ';
    case 'other': return 'その他';
    default: return '未設定';
  }
}

// ビデオリストを更新する関数
function updateVideoList() {
  chrome.storage.sync.get('videos', function(data) {
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
          ${video.rating ? `<p>評価: ${'★'.repeat(video.rating)}</p>` : ''}
        </div>
      `;
      videoList.appendChild(div);
    });
  });
}

// 統計情報を更新する関数
function updateStats() {
  chrome.storage.sync.get('videos', function(data) {
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

// 手動評価フォームを表示する関数
function showManualRatingForm() {
  const ratingForm = document.createElement('div');
  ratingForm.id = 'manual-rating-form';
  ratingForm.innerHTML = `
    <h3>動画を評価</h3>
    <input type="text" id="manual-title" placeholder="タイトルを入力" style="width: 100%; margin-bottom: 10px;">
    <select id="manual-service" style="width: 100%; margin-bottom: 10px;">
      <option value="">サービスを選択</option>
      <option value="Amazon Prime">Amazon Prime</option>
      <option value="Netflix">Netflix</option>
      <option value="U-NEXT">U-NEXT</option>
      <option value="Disney+">Disney+</option>
      <option value="Other">その他</option>
    </select>
    <select id="manual-genre" style="width: 100%; margin-bottom: 10px;">
      <option value="">ジャンルを選択</option>
      <option value="movie">映画</option>
      <option value="drama">ドラマ</option>
      <option value="anime">アニメ</option>
      <option value="other">その他</option>
    </select>
    <select id="manual-rating" style="width: 100%; margin-bottom: 10px;">
      <option value="">評価を選択</option>
      <option value="1">★☆☆☆☆</option>
      <option value="2">★★☆☆☆</option>
      <option value="3">★★★☆☆</option>
      <option value="4">★★★★☆</option>
      <option value="5">★★★★★</option>
    </select>
    <textarea id="manual-comment" placeholder="コメントを入力" rows="4" style="width: 100%; margin-bottom: 10px;"></textarea>
    <button id="submit-manual-rating" style="width: 100%; padding: 5px;">評価を送信</button>
  `;
  document.body.appendChild(ratingForm);

  document.getElementById('submit-manual-rating').addEventListener('click', submitManualRating);
}

// 手動評価を送信する関数
function submitManualRating() {
  const title = document.getElementById('manual-title').value.trim();
  const service = document.getElementById('manual-service').value;
  const genre = document.getElementById('manual-genre').value;
  const rating = document.getElementById('manual-rating').value;
  const comment = document.getElementById('manual-comment').value.trim();

  if (!title || !service) {
    alert('タイトルとサービスは必須です。');
    return;
  }

  const videoData = {
    mainTitle: title,
    service: service,
    genre: genre,
    rating: rating !== '' ? parseInt(rating) : undefined,
    comment: comment,
    status: 'completed',
    hasRating: true,
    date: new Date().toISOString(),
    lastUpdated: new Date().toISOString()
  };

  chrome.storage.sync.get('videos', function(data) {
    let videos = data.videos || [];
    videos.push(videoData);
    chrome.storage.sync.set({ videos: videos }, function() {
      if (chrome.runtime.lastError) {
        console.error('Error saving rating:', chrome.runtime.lastError);
        alert('評価の保存中にエラーが発生しました。');
      } else {
        alert('評価が保存されました。');
        document.getElementById('manual-rating-form').remove();
        updateVideoList();
        updateStats();
      }
    });
  });
}

// データを同期する関数（chrome.storage.syncを使用しているため、この関数は実際には不要ですが、UIの一貫性のために残しています）
function syncData() {
  updateVideoList();
  updateStats();
  alert('データは自動的に同期されています');
}

// DOMが読み込まれた時の処理
document.addEventListener('DOMContentLoaded', function() {
  updateVideoList();
  updateStats();

  document.getElementById('sync-button').addEventListener('click', syncData);

  document.getElementById('manage-button').addEventListener('click', function() {
    chrome.tabs.create({url: 'manage.html'});
  });

  document.getElementById('rate-button').addEventListener('click', function() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      const url = tabs[0].url;
      if (url.includes('primevideo.com') || url.includes('netflix.com') || url.includes('unext.jp') || url.includes('disneyplus.com')) {
        // サポートされているストリーミングサービスの場合
        chrome.tabs.sendMessage(tabs[0].id, {action: "showRatingPopup"}, function(response) {
          if (chrome.runtime.lastError) {
            console.error(chrome.runtime.lastError);
            showManualRatingForm();
          } else if (response && response.success) {
            window.close();
          } else {
            showManualRatingForm();
          }
        });
      } else {
        // サポートされていないページの場合、手動評価フォームを表示
        showManualRatingForm();
      }
    });
  });
});

// chrome.storage.syncの変更を監視
chrome.storage.onChanged.addListener(function(changes, namespace) {
  if (namespace === 'sync' && changes.videos) {
    updateVideoList();
    updateStats();
  }
});