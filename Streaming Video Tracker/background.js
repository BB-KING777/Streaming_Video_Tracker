// background.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "updateVideoData" || message.action === "updateRating") {
    updateVideoData(message.data, sender.tab.id);
    sendResponse({ success: true });
  }
});

chrome.webRequest.onBeforeRequest.addListener(
  function(details) {
    if (details.url.endsWith('/_/updateVideoData')) {
      let decoder = new TextDecoder("utf-8");
      let data = JSON.parse(decoder.decode(details.requestBody.raw[0].bytes));
      updateVideoData(data.data, details.tabId);
    }
  },
  {urls: ["<all_urls>"]},
  ["requestBody"]
);

function updateVideoData(data, tabId) {
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
    chrome.storage.local.set({ videos: videos }, () => {
      if (chrome.runtime.lastError) {
        console.error('Error saving data:', chrome.runtime.lastError);
      } else {
        console.log('Video data updated successfully');
        updateBadge(tabId);
      }
    });
  });
}

function updateBadge(tabId) {
  chrome.storage.local.get('videos', function(result) {
    let videos = result.videos || [];
    let inProgressCount = videos.filter(v => v.status === 'in progress').length;
    
    if (inProgressCount > 0) {
      chrome.action.setBadgeText({ text: inProgressCount.toString(), tabId: tabId });
      chrome.action.setBadgeBackgroundColor({ color: '#4CAF50', tabId: tabId });
    } else {
      chrome.action.setBadgeText({ text: '', tabId: tabId });
    }
  });
}

chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  chrome.storage.local.get('videos', function(result) {
    let videos = result.videos || [];
    let updatedVideos = videos.map(video => {
      if (video.status === 'in progress') {
        return { ...video, status: 'interrupted' };
      }
      return video;
    });
    
    chrome.storage.local.set({ videos: updatedVideos }, () => {
      if (chrome.runtime.lastError) {
        console.error('Error updating video status on tab close:', chrome.runtime.lastError);
      } else {
        console.log('Video statuses updated on tab close');
        updateBadge();
      }
    });
  });
});