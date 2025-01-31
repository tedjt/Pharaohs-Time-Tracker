/**
 * A main popup script that manage add, update and deletion of activities
 * Copyright 2010 the Time tracker Authors
 * Use of this source code is governed by a BSD-style license that can be found
 * in the "LICENSE" file.
 * Mustafa Zidan <mustafa.zidan@gmail.com>
 * Mohamed Emad <emadhegab@gmail.com>
 */

var db;
var MAX_FAILURE_COUNT=3;
var failureCount=0;

function init(tx,error){
  db = openDatabase("timeTracker_v1", "0.1", "Time tracker database.", 200000);
  db.transaction(
      function(tx) {
      //tx.executeSql("DROP TABLE timeTracker", [], null, init);
      tx.executeSql("CREATE TABLE IF NOT EXISTS timeTracker (id INTEGER PRIMARY KEY ,activity TEXT"
        +", description TEXT,start TIME,end TIME,day INTEGER,month INTEGER"
        +",year INTEGER)", [], null, init);
      }
      );
  if(!db){
    if(failureCount<=MAX_FAILURE_COUNT){
      failureCount++;
      init(tx,error)
    }else{
      showError(tx,error);
    }
  }else{
    getActivityList(new Date());
  }
}

init(null,null);

function startTracking(){
  var activityField =document.getElementById("activity").value;
  if(activityField !=null && activityField!=""){
    $('#stop').css("display","block");
    $('#start').css("display","none");
    var activity= document.getElementById("activity").value;
    var date =new Date();
    db.transaction(
        function(tx) {
        tx.executeSql("INSERT INTO timeTracker (activity,start,day,month,year) VALUES(?,?,?,?,?)",
          [activity,date,date.getDate(),date.getMonth()+1,date.getFullYear()], updateTracker, showError);
        }
        );
  }else{
    $('#errorValidation').html("Please Fill Your Activty! ");
  }
}

function stopTracking(){
  $('#start').css("display","block");
  $('#stop').css("display","none");
  db.transaction(
      function(tx) {
      tx.executeSql("update  timeTracker set end = ? where end is null ",
        [new Date()], updateTracker, showError);
      }
      );
  IS_ACTIVITY_RUNNING = false;
  clearBadge();
  getActivityList(new Date());
}

function insertDuplicatActivity(id){
  $('#stop').css("display","block");
  $('#start').css("display","none");
  var date =new Date();

  db.transaction(
      function(tx) {
      tx.executeSql("update  timeTracker set end = ? where end is null ",
        [new Date()], updateTracker, showError);
      tx.executeSql("SELECT * FROM timeTracker WHERE id=?",
        [id], function(tx,result){
        var activity=result.rows.item(0);

        tx.executeSql("INSERT INTO timeTracker (activity,start,day,month,year) VALUES(?,?,?,?,?)",
          [activity['activity'],date,date.getDate(),date.getMonth()+1,date.getFullYear()], updateTracker, showError);
        }, showError);
      getActivityList(new Date());
      }
      );
}

function showError(tx,error){
  var errorDiv=document.getElementById("error");
  errorDiv.innerHTML='<b>' + error.message + '</b><br />';
  $("#error").dialog({
bgiframe: true,
height: 70,
modal: true,
buttons: { "Ok": function() { $(this).dialog("close"); } }
});
$("#error").dialog('open');
}

function populateAcvtivityList(tx,result){
  var activityList=document.getElementById('activityList');
  var activityListStr=""
    var end="";
  var start = new Date();
  if (result.rows.length!="0") {
    for( i = 0; i < result.rows.length; i++) {
      activityListStr+="<tr style=\"cursor:pointer;\" ondblclick=\"insertDuplicatActivity("+result.rows.item(i)['id']+")\">";
      activityListStr+="<td>"+getStartDate(result.rows.item(i))+"<\/td>";
      activityListStr+="<td>"+result.rows.item(i)['activity']+"<\/td>";
      activityListStr+="<td tyle='text-align: center;' >"+getDuration(result.rows.item(i))+"<\/td>";
      activityListStr+="<td><img style=\"cursor:pointer\"   src='images/edit.png' "
        +"onclick='showEditForm("+result.rows.item(i)['id']+");'/></td>";
      activityListStr+="<td><img style=\"cursor:pointer\" height=\"16\" width=\"16\" src='images/delete.png' "+
        "onclick='deleteActivity("+result.rows.item(i)['id']+");'/></td>";
      activityListStr+="<\/tr>";
      end= result.rows.item(i)['end'];
      start= result.rows.item(i)['start'];
    }
    if (end == null ) {
      $('#stop').css("display","block");
      $('#start').css("display","none");
      IS_ACTIVITY_RUNNING = true;
      setInterval(function(){updateBadge(new Date(start));},50);
    } else {
      clearBadge();
    }
  } else {
    activityListStr= "<tr><td colspan=\"5\">You've Got No Activity This Day</td></tr>";
  }
  activityList.innerHTML=activityListStr;
}

function updateTracker(tx, result){
  //TODO every minute Update Tracker and DB with new values
}


function getStartDate(activity){
  var start = new Date(activity['start']);
  var minutes=start.getMinutes();
  var hours= start.getHours();
  var duration="";
  if(hours<10){
    duration='0';
  }
  duration+=hours+":";
  if(minutes<10){
    duration+="0";
  }
  duration+=minutes;
  return duration;

}

function getDuration(activity){
  var start=new Date(activity['start']);
  var end=new Date();
  if(activity['end']!=null){
    end=new Date(activity['end'])
  }
  var duration=(end.getTime()-start.getTime())/1000;
  var minutes=parseInt(duration/60)%60;
  var hours= parseInt(duration/3600);
  duration="";
  if(hours<10){
    duration='0';
  }
  duration+=hours+":";
  if(minutes<10){
    duration+="0";
  }
  duration+=minutes;
  return duration;
}

function showEditForm(id){
  populateEditForm(id);
  $("#dialog").dialog({
bgiframe: true,
height: 190,
modal: true,
buttons: { "Ok":function(){saveEditedActivity(id);}, "Cancel": function(){$(this).dialog("close");}}
});
$("#dialog").dialog('open');
}

function populateEditForm(id){
  db.transaction(
      function(tx) {
      tx.executeSql("SELECT * FROM timeTracker WHERE id=?",
        [id], function(tx,result){
        var activity=result.rows.item(0);
        var start=new Date(activity['start']);
        var startHours = start.getHours();
        var startMinutes = start.getMinutes();
        if(startHours<10){
        startHours = "0"+startHours;
        }
        if(startMinutes<10){
        startMinutes = "0"+startMinutes;
        }

        document.getElementById("activityId").value=activity['id'];
        document.getElementById("activityName").value=activity['activity'];
        document.getElementById("description").value=activity['description'];
        document.getElementById("from").value= startHours+":"+startMinutes;

        if(activity['end']==null){
        document.getElementById("to").disabled=true;
        document.getElementById("inprogress").checked=true;
        }else {
          var end=new Date(activity['end']);
          var endHours = end.getHours();
          var endMinutes = end.getMinutes();
          if(endHours<10){
            endHours = "0"+endHours;
          }
          if(endMinutes<10){
            endMinutes = "0"+endMinutes;
          }
          document.getElementById("to").value=endHours+":"+endMinutes;
        }
        }, showError);
      }
  );

}

function saveEditedActivity(id){
  var activityDateFrom=null;
  var activityDateTo=null;
  db.transaction(
      function(tx) {
      tx.executeSql("SELECT * FROM timeTracker WHERE id=?",
        [id], function(tx,result){
        var activity=result.rows.item(0);
        var start=new Date(activity['start']);
        var end=new Date(activity['end']);
        activityDateFrom=start;
        activityDateTo=end;
        var from =  $('#from').val();
        var to = $('#to').val();
        var fromHours=from.substring(0,2);
        var fromMinutes=from.substring(3,5);
        activityDateFrom.setHours(fromHours,fromMinutes,0);
        if(to.length>0){
        var toHours=to.substring(0,2);
        var toMinutes=to.substring(3,5);
        if(activity['end']==null) {
        activityDateTo = new Date();
        }
        activityDateTo.setHours(toHours,toMinutes,0);
        }else{
        activityDateTo=null;
        }

        tx.executeSql("update  timeTracker set activity =  ? where id = ? ",
            [$('#activityName').val(),id], updateTracker, showError);

        tx.executeSql("update  timeTracker set start =  ? where id = ? ",
            [activityDateFrom,id], updateTracker, showError);

        tx.executeSql("update  timeTracker set end =  ? where id = ? ",
            [activityDateTo,id], updateTracker, showError);

        tx.executeSql("update  timeTracker set description =  ? where id = ? ",
            [$('#description').val(),id], updateTracker, showError);
        }, showError);
      }
  );
  getActivityList(new Date());
  $("#dialog").dialog('close');
}

function inProgressSelected(elem){
  if(elem.checked){
    document.getElementById("to").disabled=true;
    document.getElementById("to").value="";
  }else{
    document.getElementById("to").disabled=false;
  }
}

function removeValidationMessage(){
  var errorValidation = document.getElementById("errorValidation");
  $("#errorValidation").html("&nbsp");
}

function deleteActivity(id){

  db.transaction(
      function(tx) {
      tx.executeSql("DELETE FROM timeTracker WHERE id  = ? " ,[id], updateTracker, showError);
      });

  getActivityList(new Date());
}

function getActivityList(date){
  var day=date.getDate();
  var month= date.getMonth()+1;
  var year= date.getFullYear();
  db.transaction(
      function(tx) {
      tx.executeSql("SELECT * FROM timeTracker where day = "+day+" and month = "+month+" and year = "+year+" ",[],populateAcvtivityList,showError);
      });
}

  function getActivityListByCal(date){
    var month=date.substring(0,2)
      var day= date.substring(3,5);
    var year= date.substring(6,10);
    db.transaction(
        function(tx) {
        tx.executeSql("SELECT * FROM timeTracker where day = "+day+" and month = "+month+" and year = "+year+" ",[],populateAcvtivityList,showError);
        });
  }


function checktime(input){
  var returnval=false
    var str=input.value;
  if (str.match(/^(([0-1]?[0-9])|([2][0-3])):([0-5]?[0-9])?$/) != null){
    $('#timeError').hide();
    return true;
  }else{
    $('#timeError').show();
    return false;
  }
}
var IS_ACTIVITY_RUNNING = false ;
function updateBadge(time) {
  if (IS_ACTIVITY_RUNNING) {
    var badge = getDateDifferenceAsMinutes(time, new Date()) ;
    chrome.browserAction.setBadgeText({text:badge});
    setInterval(function(){updateBadge(time);},60000);
  }
}

function clearBadge() {
  chrome.browserAction.setBadgeText({text:""});
}

function getDateDifferenceAsMinutes(from, to) {
  var diff= ((to.getTime() - from.getTime())/60000 | 0);
  //not that  | 0 is for casting diff to integer
  var zeros=""
    if(diff < 10 ) {
      zeros = "00";
    } else if (diff >=10 && diff <= 99) {
      zeros = "0";
    }
  return zeros+diff;
}


