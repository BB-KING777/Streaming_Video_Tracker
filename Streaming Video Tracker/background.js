function syncData() {
  chrome.storage.sync.get('videos', function(data) {
    if (chrome.runtime.lastError) {
      console.error('Error fetching synced data:', chrome.runtime.lastError);
    } else {
      chrome.storage.local.set({ videos: data.videos || [] }, function() {
        console.log('Data synced from chrome.storage.sync to local storage');
        updateGlobalBadge();
      });
    }
  });
}

function updateVideoData(data) {
  chrome.storage.local.get('videos', function(result) {
    let videos = result.videos || [];
    let existingVideoIndex = videos.findIndex(v => 
      v.mainTitle === data.mainTitle && 
      v.episodeTitle === data.episodeTitle && 
      v.service === data.service
    );
    
    if (existingVideoIndex !== -1) {
      videos[existingVideoIndex] = {
        ...videos[existingVideoIndex],
        ...data,
        lastUpdated: new Date().toISOString()
      };
    } else {
      videos.push({
        ...data,
        date: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      });
    }
    
    chrome.storage.local.set({ videos: videos }, function() {
      if (chrome.runtime.lastError) {
        console.error('Error saving data to local storage:', chrome.runtime.lastError);
      } else {
        console.log('Video data updated successfully in local storage');
        updateGlobalBadge();
        updateSyncedData(videos);
      }
    });
  });
}

function updateSyncedData(videos) {
  chrome.storage.sync.set({ videos: videos }, function() {
    if (chrome.runtime.lastError) {
      console.error('Error saving data to synced storage:', chrome.runtime.lastError);
    } else {
      console.log('Data updated in chrome.storage.sync');
    }
  });
}

function updateGlobalBadge() {
  chrome.storage.local.get('videos', function(result) {
    let videos = result.videos || [];
    let inProgressCount = videos.filter(v => v.status === 'in progress').length;
    
    if (inProgressCount > 0) {
      chrome.action.setBadgeText({ text: inProgressCount.toString() });
      chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });
    } else {
      chrome.action.setBadgeText({ text: '' });
    }
  });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "updateVideoData" || message.action === "updateRating") {
    updateVideoData(message.data);
    sendResponse({ success: true });
  } else if (message.action === "syncData") {
    syncData();
    sendResponse({ success: true });
  }
});

chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed');
  syncData();
  updateGlobalBadge();
});

// 定期的な同期（例：1時間ごと）
setInterval(syncData, 3600000);

// ストレージの変更を監視
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'sync' && changes.videos) {
    console.log('Synced storage changed, updating local storage');
    syncData();
  }
});