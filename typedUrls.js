// Event listener for clicks on links in a browser action popu.
// Open the link in a new tab of the current window.
function onAnchorClick(event) {
  chrome.tabs.create({
    selected: true,
    url: event.srcElement.href
  });
  return false;
}

// Given an array of URLs, build a DOM list of those URLs in the
// browser action popup.
function buildPopupDom(divName, data) {
  var popupDiv = document.getElementById(divName);

  var ul = document.createElement('ul');
  popupDiv.appendChild(ul);

  for (var i = 0, ie = data.length; i < ie; ++i) {
    console.log(data[i][0]);
    var a = document.createElement('a');
    a.href = data[i][0].url;
    a.appendChild(document.createTextNode(data[i][0].url));
    a.addEventListener('click', onAnchorClick);

    var li = document.createElement('li');
    li.appendChild(a);
    li.appendChild(buildUrlList(data[i][0]));

    ul.appendChild(li);
  }
}

function buildUrlList(historyItem) {
  var ul = document.createElement('ul');
  for (var prop in historyItem) {
    if(historyItem.hasOwnProperty(prop)) {
      var li = document.createElement('li');
      li.appendChild(document.createTextNode(prop +":" + historyItem[prop]));
      ul.appendChild(li);
    }
  }
  return ul;
}

// Search history to find up to ten links that a user has typed in,
// and show those links in a popup.
function buildTypedUrlList(divName) {
  // To look for history items visited in the last week,
  // subtract a week of microseconds from the current time.
  var microsecondsPerWeek = 1000 * 60 * 60 * 24 * 7;
  var oneWeekAgo = (new Date).getTime() - microsecondsPerWeek;

  // Track the number of callbacks from chrome.history.getVisits()
  // that we expect to get.  When it reaches zero, we have all results.
  var numRequestsOutstanding = 0;

  chrome.tabs.getSelected(null, function(tab) {
  var tablink = tab.url.split('/')[2];
  tablink =tablink.split('.').slice(-2).join(".");
  console.log(tablink);

  chrome.history.search({
      'text': tablink,              // Return every history item....
      'startTime': oneWeekAgo  // that was accessed less than one week ago.
    },
    function(historyItems) {
      var sortedHistoryItems = historyItems.sort(function(a, b) {
          return b.visitCount - a.visitCount;
          });
      // For each history item, get details on all visits.
      for (var i = 0; i < historyItems.length; ++i) {
        var url = historyItems[i].url;
        if (url.indexOf(tablink) ==-1) {continue;}
        var processVisitsWithUrl = function(historyItem) {
          // We need the url of the visited item to process the visit.
          // Use a closure to bind the  url into the callback's args.
          return function(visitItems) {
            processVisits(historyItem, visitItems);
          };
        };
        chrome.history.getVisits({url: url}, processVisitsWithUrl(historyItems[i]));
        numRequestsOutstanding++;
      }
      if (!numRequestsOutstanding) {
        onAllVisitsProcessed();
      }
    });
  });


  // Maps URLs to a count of the number of times the user typed that URL into
  // the omnibox.
  var urlToCount = {};

  // Callback for chrome.history.getVisits().  Counts the number of
  // times a user visited a URL by typing the address.
  var processVisits = function(historyItem, visitItems) {
    for (var i = 0, ie = visitItems.length; i < ie; ++i) {
      // Ignore items unless the user typed the URL.
      if (visitItems[i].transition != 'typed') {
        //insert some condition
      }

      if (!urlToCount[historyItem.url]) {
        urlToCount[historyItem.url] = [0, historyItem];
      }

      urlToCount[historyItem.url][0]++;
    }

    // If this is the final outstanding call to processVisits(),
    // then we have the final results.  Use them to build the list
    // of URLs to show in the popup.
    if (!--numRequestsOutstanding) {
      onAllVisitsProcessed();
    }
  };

  // This function is called when we have the final list of URls to display.
  var onAllVisitsProcessed = function() {
    // Get the top scorring urls.
    urlArray = [];
    for (var url in urlToCount) {
      urlArray.push([urlToCount[url][1], urlToCount[url][0]]);
    }

    // Sort the URLs by the number of times the user typed them.
    urlArray.sort(function(a, b) {
      return b[1] - a[1];
    });

    buildPopupDom(divName, urlArray.slice(0, 10));
  };
}
