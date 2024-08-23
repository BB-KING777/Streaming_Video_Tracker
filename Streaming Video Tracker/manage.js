// manage.js
let videoList = [];

function loadVideos() {
  chrome.storage.local.get('videos', function(data) {
    videoList = data.videos || [];
    videoList = videoList.filter(video => video.status !== 'unknown');
    renderVideoList();
  });
}

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

function renderVideoList(filteredList = videoList) {
  const listElement = document.getElementById('video-list');
  listElement.innerHTML = '';
  filteredList.forEach((video, index) => {
    const li = document.createElement('li');
    li.className = 'video-item';
    li.innerHTML = `
      <div class="video-title">${video.mainTitle}${video.episodeTitle ? ` - ${video.episodeTitle}` : ''}</div>
      <div class="video-info">
        <p><strong>サービス:</strong> ${video.service}</p>
        ${video.genre ? `<p><strong>ジャンル:</strong> ${getGenreJapanese(video.genre)}</p>` : ''}
        <p><strong>視聴状況:</strong> ${video.status === 'completed' ? '視聴完了' : (video.status === 'in progress' ? '視聴中' : '不明')}</p>
        <p><strong>視聴時間:</strong> ${formatDuration(video.watchedDuration)} / ${formatDuration(video.totalDuration)}</p>
        <p><strong>最終更新:</strong> ${new Date(video.lastUpdated).toLocaleString('ja-JP')}</p>
      </div>
      ${video.hasRating ? `
        ${video.rating ? `<p><strong>評価:</strong> ${'★'.repeat(video.rating)}</p>` : ''}
        ${video.comment ? `<p><strong>コメント:</strong> ${video.comment}</p>` : ''}
        <textarea class="edit-comment" data-index="${index}" placeholder="コメントを入力">${video.comment || ''}</textarea>
        <button class="save-comment" data-index="${index}">コメントを保存</button>
        <button class="delete-rating" data-index="${index}">評価を削除</button>
      ` : ''}
    `;
    listElement.appendChild(li);
  });

  // コメント保存のイベントリスナーを追加
  document.querySelectorAll('.save-comment').forEach(button => {
    button.addEventListener('click', function() {
      const index = this.dataset.index;
      const textarea = document.querySelector(`.edit-comment[data-index="${index}"]`);
      videoList[index].comment = textarea.value;
      saveVideos();
      alert('コメントが保存されました');
    });
  });

  // 評価削除のイベントリスナーを追加
  document.querySelectorAll('.delete-rating').forEach(button => {
    button.addEventListener('click', function() {
      const index = this.dataset.index;
      if (confirm('この評価を削除してもよろしいですか？')) {
        videoList.splice(index, 1); // 完全に削除
        saveVideos().then(() => {
          renderVideoList();
        });
      }
    });
  });
}

function saveVideos() {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set({ videos: videoList }, function() {
      if (chrome.runtime.lastError) {
        console.error('Error saving videos:', chrome.runtime.lastError);
        reject(chrome.runtime.lastError);
      } else {
        resolve();
      }
    });
  });
}

function searchAndFilterVideos() {
  const searchTerm = document.getElementById('search-input').value.toLowerCase();
  const genreFilter = document.getElementById('genre-filter').value;
  const filteredList = videoList.filter(video => 
    (video.mainTitle.toLowerCase().includes(searchTerm) || 
    (video.episodeTitle && video.episodeTitle.toLowerCase().includes(searchTerm))) &&
    (genreFilter === '' || video.genre === genreFilter)
  );
  renderVideoList(filteredList);
}

function sortVideos() {
  const sortMethod = document.getElementById('sort-select').value;
  switch(sortMethod) {
    case 'date':
      videoList.sort((a, b) => new Date(b.lastUpdated) - new Date(a.lastUpdated));
      break;
    case 'rating':
      videoList.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      break;
    case 'title':
      videoList.sort((a, b) => a.mainTitle.localeCompare(b.mainTitle));
      break;
  }
  searchAndFilterVideos();
}

document.addEventListener('DOMContentLoaded', function() {
  loadVideos();
  document.getElementById('search-button').addEventListener('click', searchAndFilterVideos);
  document.getElementById('genre-filter').addEventListener('change', searchAndFilterVideos);
  document.getElementById('sort-select').addEventListener('change', sortVideos);
  document.getElementById('search-input').addEventListener('input', searchAndFilterVideos);
});

// ストレージの変更を監視
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.videos) {
    videoList = changes.videos.newValue || [];
    renderVideoList();
  }
});