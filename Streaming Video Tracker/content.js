// content.js

// グローバルスコープで変数を宣言
let currentService = '';
let videoData = {
  mainTitle: '',
  episodeTitle: '',
  totalDuration: 0,
  watchedDuration: 0,
  lastPosition: 0,
  status: 'not started',
  service: '',
  ratingShown: false,
  genre: '',
  hasRating: false
};
let intervalId = null;
let titleObserver = null;

function detectStreamingService() {
  const host = window.location.hostname;
  if (host.includes('unext.jp')) return 'U-NEXT';
  if (host.includes('netflix.com')) return 'Netflix';
  if (host.includes('primevideo.com')) return 'Amazon Prime';
  if (host.includes('disneyplus.com')) return 'Disney+';
  return 'Unknown';
}

function extractTitleFromElement(element) {
  let mainTitle = '';
  let episodeTitle = '';

  switch (currentService) {
    case 'U-NEXT':
      mainTitle = element.querySelector('.front_contents_title, .card__heading, [data-content-id]')?.textContent.trim() || '';
      episodeTitle = element.querySelector('.series-title-content, .card__subheading, [data-episode-id]')?.textContent.trim() || '';
      break;
    case 'Netflix':
      mainTitle = element.querySelector('[data-uia="video-title"], .video-title, .title-content')?.textContent.trim() || '';
      episodeTitle = element.querySelector('[data-uia="episode-title"], .episode-title, .episodeTitleValue')?.textContent.trim() || '';
      break;
    case 'Amazon Prime':
      mainTitle = element.querySelector('.dv-pack-title, .atvwebplayersdk-title-text')?.textContent.trim() || '';
      episodeTitle = element.querySelector('.dv-episode-title, .atvwebplayersdk-subtitle-text')?.textContent.trim() || '';
      break;
    case 'Disney+':
      mainTitle = element.querySelector('.title-field, .content-title')?.textContent.trim() || '';
      episodeTitle = element.querySelector('.subtitle-field, .content-subtitle')?.textContent.trim() || '';
      break;
  }

  return { mainTitle, episodeTitle };
}

document.body.addEventListener('click', function(event) {
  const clickedElement = event.target;
  const { mainTitle, episodeTitle } = extractTitleFromElement(clickedElement);
  
  if (mainTitle) {
    videoData.mainTitle = mainTitle;
    videoData.episodeTitle = episodeTitle;
    console.log(`Clicked on: ${mainTitle} - ${episodeTitle}`);
  }
});

function resetVideoData() {
  videoData = {
    mainTitle: '',
    episodeTitle: '',
    totalDuration: 0,
    watchedDuration: 0,
    lastPosition: 0,
    status: 'not started',
    service: currentService,
    ratingShown: false,
    genre: '',
    hasRating: false
  };
}

function detectVideoExit() {
  const videoElement = document.querySelector('video');
  if (!videoElement) {
    if (videoData.status === 'in progress') {
      console.log('Video element not found, updating status to interrupted');
      videoData.status = 'interrupted';
      sendMessageWithRetry({
        action: "updateVideoData",
        data: videoData
      });
      resetVideoData();
    }
  }
}

function getVideoInfo() {
  try {
    currentService = detectStreamingService();
    const video = document.querySelector('video');

    if (!video) {
      detectVideoExit();
      return;
    }

    const currentTime = video.currentTime;
    const duration = video.duration;

    if (videoData.mainTitle && 
        (videoData.totalDuration !== duration || 
         Math.abs(videoData.lastPosition - currentTime) > 30)) {
      
      sendMessageWithRetry({
        action: "updateVideoData",
        data: { ...videoData, status: 'completed' }
      });

      if (videoData.totalDuration !== duration) {
        resetVideoData();
      } else {
        videoData.watchedDuration += Math.min(currentTime - videoData.lastPosition, 30);
      }
    }

    videoData.service = currentService;
    videoData.totalDuration = duration;
    videoData.lastPosition = currentTime;
    videoData.watchedDuration = Math.max(videoData.watchedDuration, currentTime);

    if (!videoData.mainTitle) {
      const { mainTitle, episodeTitle } = extractTitleFromElement(document.body);
      videoData.mainTitle = mainTitle;
      videoData.episodeTitle = episodeTitle;
    }

    if (duration > 0) {
      if (currentTime / duration >= 0.9 && !videoData.ratingShown) {
        videoData.status = 'completed';
        showRatingPopup();
      } else if (currentTime > 0) {
        videoData.status = 'in progress';
        showViewingStatus();
      }
    } else {
      videoData.status = 'unknown';
    }

    sendMessageWithRetry({
      action: "updateVideoData",
      data: videoData
    });
  } catch (error) {
    console.error('Error in getVideoInfo:', error);
    handleError(error);
  }
}

function showViewingStatus() {
  let statusElement = document.getElementById('extension-viewing-status');
  if (!statusElement) {
    statusElement = document.createElement('div');
    statusElement.id = 'extension-viewing-status';
    statusElement.style.position = 'fixed';
    statusElement.style.top = '10px';
    statusElement.style.right = '10px';
    statusElement.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    statusElement.style.color = 'white';
    statusElement.style.padding = '10px';
    statusElement.style.borderRadius = '5px';
    statusElement.style.zIndex = '9999';
    statusElement.style.transition = 'opacity 0.5s';
    document.body.appendChild(statusElement);
  }
  const displayTitle = videoData.mainTitle || videoData.episodeTitle ? 
    `[${videoData.mainTitle}${videoData.episodeTitle ? ` - ${videoData.episodeTitle}` : ''}]を視聴しています。` :
    'タイトルが取得できませんでした。';
  
  statusElement.innerHTML = `
    <p>${displayTitle}</p>
    ${!videoData.mainTitle && !videoData.episodeTitle ? '<p>[タイトル]を視聴中</p>' : ''}
  `;
  statusElement.style.opacity = '1';

  setTimeout(() => {
    statusElement.style.opacity = '0';
  }, 5000);
}

function showRatingPopup(fromPopup = false) {
  if (videoData.ratingShown && !fromPopup) return;

  let popupElement = document.getElementById('extension-rating-popup');
  if (!popupElement) {
    popupElement = document.createElement('div');
    popupElement.id = 'extension-rating-popup';
    popupElement.style.position = 'fixed';
    popupElement.style.top = '10px';
    popupElement.style.right = '10px';
    popupElement.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
    popupElement.style.padding = '20px';
    popupElement.style.borderRadius = '10px';
    popupElement.style.zIndex = '10000';
    popupElement.style.boxShadow = '0 0 10px rgba(0,0,0,0.5)';
    popupElement.style.maxWidth = '300px';
    const displayTitle = videoData.mainTitle || videoData.episodeTitle ? 
      `${videoData.mainTitle}${videoData.episodeTitle ? ` - ${videoData.episodeTitle}` : ''}` :
      '';
    popupElement.innerHTML = `
      <div style="text-align: right;">
        <label for="opacity-slider">透過度: </label>
        <input type="range" id="opacity-slider" min="0" max="100" value="90">
        <button id="close-rating">×</button>
      </div>
      <h2 style="font-size: 16px; margin-top: 10px;">この作品を評価</h2>
      <input type="text" id="title-input" placeholder="タイトルを入力" value="${displayTitle}" style="width: 100%; margin-bottom: 10px;">
      <select id="genre-select" style="width: 100%; margin-bottom: 10px;">
        <option value="">ジャンルを選択</option>
        <option value="movie">映画</option>
        <option value="drama">ドラマ</option>
        <option value="anime">アニメ</option>
        <option value="other">その他</option>
      </select>
      <select id="rating-select" style="width: 100%; margin-bottom: 10px;">
        <option value="">評価を選択</option>
        <option value="1">★☆☆☆☆</option>
        <option value="2">★★☆☆☆</option>
        <option value="3">★★★☆☆</option>
        <option value="4">★★★★☆</option>
        <option value="5">★★★★★</option>
      </select>
      <textarea id="rating-comment" placeholder="コメントを入力" rows="4" style="width: 100%; margin-bottom: 10px;"></textarea>
      <button id="submit-rating" style="width: 100%; padding: 5px;">評価を送信</button>
    `;
    document.body.appendChild(popupElement);

    document.getElementById('opacity-slider').addEventListener('input', function() {
      const opacity = (100 - this.value) / 100;
      popupElement.style.backgroundColor = `rgba(255, 255, 255, ${opacity})`;
    });

    document.getElementById('submit-rating').addEventListener('click', function(e) {
      e.stopPropagation();
      submitRating();
    });

    document.getElementById('close-rating').addEventListener('click', function(e) {
      e.stopPropagation();
      popupElement.remove();
    });

    popupElement.addEventListener('click', function(e) {
      e.stopPropagation();
    });
  }
}

function submitRating() {
  const title = document.getElementById('title-input').value.trim();
  const genre = document.getElementById('genre-select').value;
  const rating = document.getElementById('rating-select').value;
  const comment = document.getElementById('rating-comment').value.trim();

  if (rating === '' && genre === '' && comment === '') {
    alert('評価、ジャンル、またはコメントを入力してください。');
    return;
  }

  if (!videoData.mainTitle && title) videoData.mainTitle = title;
  if (genre !== '') videoData.genre = genre;
  videoData.hasRating = true;
  
  const updatedData = {
    ...videoData,
    rating: rating !== '' ? parseInt(rating) : undefined,
    comment: comment !== '' ? comment : undefined
  };

  Object.keys(updatedData).forEach(key => 
    (updatedData[key] === undefined || updatedData[key] === '') && delete updatedData[key]
  );

  sendMessageWithRetry({
    action: "updateRating",
    data: updatedData
  });
  document.getElementById('extension-rating-popup').remove();
  videoData.ratingShown = true;
}

function sendMessageWithRetry(message, maxRetries = 3, delay = 1000) {
  return new Promise((resolve, reject) => {
    function attemptSend(retriesLeft) {
      chrome.runtime.sendMessage(message, response => {
        if (chrome.runtime.lastError) {
          console.warn('Error sending message:', chrome.runtime.lastError);
          if (retriesLeft > 0) {
            setTimeout(() => attemptSend(retriesLeft - 1), delay);
          } else {
            handleError(chrome.runtime.lastError);
            reject(chrome.runtime.lastError);
          }
        } else {
          resolve(response);
        }
      });
    }
    attemptSend(maxRetries);
  });
}

function handleError(error) {
  if (error.message === 'Extension context invalidated.') {
    console.log('Extension context invalidated. Attempting to recover...');
    setTimeout(reinitializeExtension, 1000);
  } else {
    console.error('Unhandled error:', error);
  }
}

function reinitializeExtension() {
  const extensionElements = document.querySelectorAll('[id^="extension-"]');
  extensionElements.forEach(el => el.remove());
  startTracking();
}

function handlePageUnload() {
  if (videoData.mainTitle && videoData.status === 'in progress') {
    videoData.status = 'interrupted';
    navigator.sendBeacon(
      chrome.runtime.getURL('/_/updateVideoData'),
      JSON.stringify({
        action: "updateVideoData",
        data: videoData
      })
    );
  }
}

function startTracking() {
  if (intervalId === null) {
    getVideoInfo();
    intervalId = setInterval(getVideoInfo, 5000);
    
    titleObserver = new MutationObserver((mutations) => {
      for (let mutation of mutations) {
        if (mutation.type === 'childList') {
          const { mainTitle, episodeTitle } = extractTitleFromElement(document.body);
          if (mainTitle || episodeTitle) {
            videoData.mainTitle = mainTitle;
            videoData.episodeTitle = episodeTitle;
            console.log(`Updated title: ${mainTitle} - ${episodeTitle}`);
            break;
          }
        }
      }
      detectVideoExit();
    });
    
    titleObserver.observe(document.body, { childList: true, subtree: true });
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata?.addEventListener('change', handleMediaSessionChange);
    }
    window.addEventListener('beforeunload', handlePageUnload);
  }
}

function stopTracking() {
  if (intervalId !== null) {
    clearInterval(intervalId);
    intervalId = null;
    if (titleObserver) {
      titleObserver.disconnect();
    }
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata?.removeEventListener('change', handleMediaSessionChange);
    }
    window.removeEventListener('beforeunload', handlePageUnload);
    // Ensure we update the status when stopping tracking
    if (videoData.status === 'in progress') {
      videoData.status = 'interrupted';
      sendMessageWithRetry({
        action: "updateVideoData",
        data: videoData
      });
    }
  }
}

function handleMediaSessionChange() {
  const metadata = navigator.mediaSession.metadata;
  if (metadata) {
    videoData.mainTitle = metadata.title || videoData.mainTitle;
    videoData.episodeTitle = metadata.artist || videoData.episodeTitle;
    console.log(`Updated title from Media Session: ${videoData.mainTitle} - ${videoData.episodeTitle}`);
  }
}

// 初期化
currentService = detectStreamingService();
startTracking();

// イベントリスナーの設定
document.addEventListener('visibilitychange', function() {
  if (document.hidden) {
    stopTracking();
  } else {
    startTracking();
  }
});

window.addEventListener('error', function(event) {
  if (event.error && event.error.message === 'Extension context invalidated.') {
    handleError(event.error);
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "showRatingPopup") {
    showRatingPopup(true);
    sendResponse({success: true});
  }
});