
window.onclick = function(event) 
{
	CheckMaintenanceEnableModalOnclick(event);
	CheckMaintenanceDisableModalOnclick(event);
} 

function InitializeJavascript()
{
	InitializeJavascriptNotifications();
	InitializeJavascriptOutputControl();
}

//----------- email & log setting functions -------------------------

var EmailLicense = 0;
var ProfitraceLicense = 0;

//-----------

var EmailNotifiesSYS = [
  '0',
  '0',
  '0'
  ];


var EmailNotifiesC1 = [
  '0',
  '0',
  '0',
  '0',
  '0',
  '0',
  '0',
  '0',
  '0',
  '0',
  '0',
  '0',
  '0',
  '0',
  '0'
  ];

var EmailNotifiesC2 = [
  '0',
  '0',
  '0',
  '0',
  '0',
  '0',
  '0',
  '0',
  '0',
  '0',
  '0',
  '0',
  '0',
  '0',
  '0'
  ];

var EmailNotifiesC3 = [
  '0',
  '0',
  '0',
  '0',
  '0',
  '0',
  '0',
  '0',
  '0',
  '0',
  '0',
  '0',
  '0',
  '0',
  '0'
  ];

var EmailNotifiesC4 = [
  '0',
  '0',
  '0',
  '0',
  '0',
  '0',
  '0',
  '0',
  '0',
  '0',
  '0',
  '0',
  '0',
  '0',
  '0'
  ];

var LogNotifiesSYS = [
  '0',
  '0',
  '0'
  ];


var LogNotifiesC1 = [
  '2',
  '0',
  '2',
  '2',
  '2',
  '0',
  '0',
  '2',
  '2',
  '2',
  '2',
  '2',
  '2',
  '2',
  '2'
  ];

var LogNotifiesC2 = [
  '2',
  '0',
  '2',
  '2',
  '2',
  '0',
  '0',
  '2',
  '2',
  '2',
  '2',
  '2',
  '2',
  '2',
  '2'
  ];

var LogNotifiesC3 = [
  '2',
  '0',
  '2',
  '2',
  '2',
  '0',
  '0',
  '2',
  '2',
  '2',
  '2',
  '2',
  '2',
  '2',
  '2'
  ];

var LogNotifiesC4 = [
  '2',
  '0',
  '2',
  '2',
  '2',
  '0',
  '0',
  '2',
  '2',
  '2',
  '2',
  '2',
  '2',
  '2',
  '2'
  ];

var ShortNames = [
  'lost',
  'sync',
  'rpts',
  'illg',
  'indi',
  'exdi',
  'dxdi',
  'msls',
  'baud',
  'volt',
  'idle',
  'rfail',
  'paevt',
  'foevt',
  'foring'
  ];

var LongNames  = [
  'Lost',
  'Syncs',
  'Repeats',
  'Illegal',
  'IntDiag',
  'ExtDiag',
  'DxDiag',
  'MasterLost',
  'Baudrate',
  'Bargraph',
  'IdleLevel',
  'RedFail',
  'PaEvent',
  'FoEvent',
  'FoRingFail'
  ];

var ShortNamesSYS = [
  'rpwr',
  'pwme',
  'sysf'
  ];

var LongNamesSYS  = [
  'RedPower',
  'PowerMod',
  'SysFail'
  ];

//-----------

function InitializeJavascriptNotifications()
{
  EmailLicense = 1;
  ProfitraceLicense = Math.min(4,4);

  var Warnings = [];

  for(var i=1; i < 5; i++){

    var obj_id_warnings = "warnings_area_" + i;
    var obj_id_email    = "notify_email_C" + i;
    var obj_id_log      = "notify_log_C"   + i;

    if (ProfitraceLicense < i){
      // disable email+log enable button
      SetEnabled(obj_id_email,false);
      SetCheckBoxValue(obj_id_email,false);
      SetEnabled(obj_id_log,false);
      SetCheckBoxValue(obj_id_log,false);
      SetVisibility("NotifySetting_C"+i,false);
      SetVisibility("save_button_C"+i,false);
    }
    else {
      if (EmailLicense == 0){
        // disable email enable button
        SetEnabled(obj_id_email,false);
        SetCheckBoxValue(obj_id_email,false);
        Warnings = AddWarning(Warnings,"이메일을 위한 라이센스가 없습니다.");
      }
    }

    DisplayWarnings(Warnings,obj_id_warnings);
  }

/* ----- */

  for(var i=0; i<ShortNamesSYS.length; i++){
    SetSelectBoxValue("email_"+ShortNamesSYS[i]+"_SYS",EmailNotifiesSYS[i]);
  }

  SetEnabledAll("email","SYS");
  var EmailIntervalSYS = parseInt("120");
  SetTextValue("email_interval_minutes_SYS", EmailIntervalSYS%(60) );
  SetTextValue("email_interval_hours_SYS",   parseInt(EmailIntervalSYS%(60*24)/60) );
  SetTextValue("email_interval_days_SYS",    parseInt(EmailIntervalSYS/(60*24)) );

/* ----- */

  for(var i=0; i<ShortNames.length; i++){
    SetSelectBoxValue("email_"+ShortNames[i]+"_C1",EmailNotifiesC1[i]);
  }

  SetEnabledAll("email","C1");
  var EmailIntervalC1 = parseInt("120");
  SetTextValue("email_interval_minutes_C1", EmailIntervalC1%(60) );
  SetTextValue("email_interval_hours_C1",   parseInt(EmailIntervalC1%(60*24)/60) );
  SetTextValue("email_interval_days_C1",    parseInt(EmailIntervalC1/(60*24)) );

/* ----- */

  for(var i=0; i<ShortNames.length; i++){
    SetSelectBoxValue("email_"+ShortNames[i]+"_C2",EmailNotifiesC2[i]);
  }

  SetEnabledAll("email","C2");
  var EmailIntervalC2 = parseInt("120");
  SetTextValue("email_interval_minutes_C2", EmailIntervalC2%(60) );
  SetTextValue("email_interval_hours_C2",   parseInt(EmailIntervalC2%(60*24)/60) );
  SetTextValue("email_interval_days_C2",    parseInt(EmailIntervalC2/(60*24)) );

/* ----- */

  for(var i=0; i<ShortNames.length; i++){
    SetSelectBoxValue("email_"+ShortNames[i]+"_C3",EmailNotifiesC3[i]);
  }

  SetEnabledAll("email","C3");
  var EmailIntervalC3 = parseInt("120");
  SetTextValue("email_interval_minutes_C3", EmailIntervalC3%(60) );
  SetTextValue("email_interval_hours_C3",   parseInt(EmailIntervalC3%(60*24)/60) );
  SetTextValue("email_interval_days_C3",    parseInt(EmailIntervalC3/(60*24)) );

/* ----- */

  for(var i=0; i<ShortNames.length; i++){
    SetSelectBoxValue("email_"+ShortNames[i]+"_C4",EmailNotifiesC4[i]);
  }

  SetEnabledAll("email","C4");
  var EmailIntervalC4 = parseInt("120");
  SetTextValue("email_interval_minutes_C4", EmailIntervalC4%(60) );
  SetTextValue("email_interval_hours_C4",   parseInt(EmailIntervalC4%(60*24)/60) );
  SetTextValue("email_interval_days_C4",    parseInt(EmailIntervalC4/(60*24)) );

/* --------------------------- */

  for(var i=0; i<ShortNamesSYS.length; i++){
    SetSelectBoxValue("log_"+ShortNamesSYS[i]+"_SYS",LogNotifiesSYS[i]);
  }

  SetEnabledAll("log","SYS");
  var LogIntervalSYS = parseInt("15");
  SetTextValue("log_interval_minutes_SYS", LogIntervalSYS%(60) );
  SetTextValue("log_interval_hours_SYS",   parseInt(LogIntervalSYS%(60*24)/60) );
  SetTextValue("log_interval_days_SYS",    parseInt(LogIntervalSYS/(60*24)) );

/* ----- */

  for(var i=0; i<ShortNames.length; i++){
    SetSelectBoxValue("log_"+ShortNames[i]+"_C1",LogNotifiesC1[i]);
  }

  SetEnabledAll("log","C1");
  var LogIntervalC1 = parseInt("15");
  SetTextValue("log_interval_minutes_C1", LogIntervalC1%(60) );
  SetTextValue("log_interval_hours_C1",   parseInt(LogIntervalC1%(60*24)/60) );
  SetTextValue("log_interval_days_C1",    parseInt(LogIntervalC1/(60*24)) );

/* ----- */

  for(var i=0; i<ShortNames.length; i++){
    SetSelectBoxValue("log_"+ShortNames[i]+"_C2",LogNotifiesC2[i]);
  }

  SetEnabledAll("log","C2");
  var LogIntervalC2 = parseInt("15");
  SetTextValue("log_interval_minutes_C2", LogIntervalC2%(60) );
  SetTextValue("log_interval_hours_C2",   parseInt(LogIntervalC2%(60*24)/60) );
  SetTextValue("log_interval_days_C2",    parseInt(LogIntervalC2/(60*24)) );

/* ----- */

  for(var i=0; i<ShortNames.length; i++){
    SetSelectBoxValue("log_"+ShortNames[i]+"_C3",LogNotifiesC3[i]);
  }

  SetEnabledAll("log","C3");
  var LogIntervalC3 = parseInt("15");
  SetTextValue("log_interval_minutes_C3", LogIntervalC3%(60) );
  SetTextValue("log_interval_hours_C3",   parseInt(LogIntervalC3%(60*24)/60) );
  SetTextValue("log_interval_days_C3",    parseInt(LogIntervalC3/(60*24)) );

/* ----- */

  for(var i=0; i<ShortNames.length; i++){
    SetSelectBoxValue("log_"+ShortNames[i]+"_C4",LogNotifiesC4[i]);
  }

  SetEnabledAll("log","C4");
  var LogIntervalC4 = parseInt("15");
  SetTextValue("log_interval_minutes_C4", LogIntervalC4%(60) );
  SetTextValue("log_interval_hours_C4",   parseInt(LogIntervalC4%(60*24)/60) );
  SetTextValue("log_interval_days_C4",    parseInt(LogIntervalC4/(60*24)) );

/* ----- */

}

//-----------

function SetEnabledAll(to_group,ClusterId)
{
	var CheckBoxId = "notify_"+to_group+"_" + ClusterId;
  var obj_ref = document.getElementById(CheckBoxId);

  var NamesToUse = ShortNames;
  if (ClusterId == "SYS"){
    NamesToUse = ShortNamesSYS;
  }

  if (obj_ref != null){
    for(var i=0; i<NamesToUse.length; i++){
      SetEnabled(to_group+"_"+NamesToUse[i]+"_"       + ClusterId, obj_ref.checked);
      SetEnabled(to_group+"_once_"+NamesToUse[i]+"_"+ ClusterId, obj_ref.checked && (GetSelectBoxValue(to_group+"_"+NamesToUse[i]+"_" + ClusterId, 0) == 1) );
      
      SetEnabled(to_group+"_"+NamesToUse[i]+"_group1_"+ ClusterId, obj_ref.checked && (GetSelectBoxValue(to_group+"_"+NamesToUse[i]+"_" + ClusterId, 0) != 0) );
      SetEnabled(to_group+"_"+NamesToUse[i]+"_group2_"+ ClusterId, obj_ref.checked && (GetSelectBoxValue(to_group+"_"+NamesToUse[i]+"_" + ClusterId, 0) != 0) );
      SetEnabled(to_group+"_"+NamesToUse[i]+"_group3_"+ ClusterId, obj_ref.checked && (GetSelectBoxValue(to_group+"_"+NamesToUse[i]+"_" + ClusterId, 0) != 0) );
      SetEnabled(to_group+"_"+NamesToUse[i]+"_group4_"+ ClusterId, obj_ref.checked && (GetSelectBoxValue(to_group+"_"+NamesToUse[i]+"_" + ClusterId, 0) != 0) );
    }

    SetEnabled(to_group+"_btn_group1_"  + ClusterId, obj_ref.checked);
    SetEnabled(to_group+"_btn_group2_"  + ClusterId, obj_ref.checked);
    SetEnabled(to_group+"_btn_group3_"  + ClusterId, obj_ref.checked);
    SetEnabled(to_group+"_btn_group4_"  + ClusterId, obj_ref.checked);

    SetEnabled(to_group+"_btn_off_"          + ClusterId, obj_ref.checked);
    SetEnabled(to_group+"_btn_once_"         + ClusterId, obj_ref.checked);
    SetEnabled(to_group+"_btn_interval_"     + ClusterId, obj_ref.checked);
    SetEnabled(to_group+"_interval_minutes_" + ClusterId, obj_ref.checked);
    SetEnabled(to_group+"_interval_hours_"   + ClusterId, obj_ref.checked);
    SetEnabled(to_group+"_interval_days_"    + ClusterId, obj_ref.checked);
  }
}

//-----------

function SetAllNotificationsTo(to_group,to_value,clusterNo)
{
  var NamesToUse = ShortNames;
  if (clusterNo == "SYS"){
    NamesToUse = ShortNamesSYS;
  }
  
  for(var i=0; i<NamesToUse.length; i++){
    SetSelectBoxValue(to_group+"_"+NamesToUse[i]+"_"+clusterNo,to_value);
    CheckArmedBox(to_group,to_value == 1,clusterNo,NamesToUse[i]);

    SetEnabled(to_group+"_"+NamesToUse[i]+"_group1_"+ clusterNo, to_value != 0 );
    SetEnabled(to_group+"_"+NamesToUse[i]+"_group2_"+ clusterNo, to_value != 0 );
    SetEnabled(to_group+"_"+NamesToUse[i]+"_group3_"+ clusterNo, to_value != 0 );
    SetEnabled(to_group+"_"+NamesToUse[i]+"_group4_"+ clusterNo, to_value != 0 );
  }
}

//-----------

function CheckArmedBox(to_group,to_checked,clusterNo, stat)
{
  SetCheckBoxValue(to_group+"_once_"+stat+"_" + clusterNo, to_checked);
  SetEnabled(to_group+"_once_"+stat+"_" + clusterNo, to_checked);
}

//-----------

function SelectBoxChange(to_group,StatName,clusterNo)
{
  var to_value = GetSelectBoxValue(to_group+"_"+StatName+"_"+clusterNo,-1);
  if (to_value != -1){
    CheckArmedBox(to_group,to_value == 1,clusterNo,StatName);

    SetEnabled(to_group+"_"+StatName+"_group1_"+ clusterNo, to_value != 0 );
    SetEnabled(to_group+"_"+StatName+"_group2_"+ clusterNo, to_value != 0 );
    SetEnabled(to_group+"_"+StatName+"_group3_"+ clusterNo, to_value != 0 );
    SetEnabled(to_group+"_"+StatName+"_group4_"+ clusterNo, to_value != 0 );
  }
}

//-----------

function ToggleGroup(to_group,group_nr,clusterNo)
{
  var NamesToUse = ShortNames;
  if (clusterNo == "SYS"){
    NamesToUse = ShortNamesSYS;
  }
  
  var to_value = 0;
  for(var i=0; i<NamesToUse.length; i++){
    if (GetCheckBoxValue(to_group+"_"+NamesToUse[i]+"_group"+group_nr+"_"+ clusterNo, 0 ) == 0) to_value = 1;
  }
  
  for(var i=0; i<NamesToUse.length; i++){
    SetCheckBoxValue(to_group+"_"+NamesToUse[i]+"_group"+group_nr+"_"+ clusterNo, to_value );
  }
  
}

//-----------

function GatherSettingsFromNetwork(clusterNo, clusterName,ShortNameArray, LongNameArray)
{
  var args = [];

  args.push("setting_Email-Enabled-"+clusterNo+":"  + GetCheckBoxValue("notify_email_"+clusterNo,0));

  for(var j=0; j<ShortNameArray.length; j++){
    args.push("setting_Email-Notify-"+LongNameArray[j]+"-"+clusterNo+":"       + GetSelectBoxValue('email_'+ShortNameArray[j]+'_'+clusterNo,0) );
  }

  for(var j=0; j<ShortNameArray.length; j++){
    args.push("setting_Email-Armed-"+LongNameArray[j]+"-"+clusterNo+":"        + GetCheckBoxValue("email_once_"+ShortNameArray[j]+"_"+clusterNo,0));
  }

  for(var j=0; j<ShortNameArray.length; j++){

    var CheckBoxValues = 0;
    if (GetCheckBoxValue("email_"+ShortNameArray[j]+"_group1_"+clusterNo,0) != 0) CheckBoxValues |= 0x01;
    if (GetCheckBoxValue("email_"+ShortNameArray[j]+"_group2_"+clusterNo,0) != 0) CheckBoxValues |= 0x02;
    if (GetCheckBoxValue("email_"+ShortNameArray[j]+"_group3_"+clusterNo,0) != 0) CheckBoxValues |= 0x04;
    if (GetCheckBoxValue("email_"+ShortNameArray[j]+"_group4_"+clusterNo,0) != 0) CheckBoxValues |= 0x08;
    
    args.push("setting_Email-Groups-"+LongNameArray[j]+"-"+clusterNo+":" + CheckBoxValues);
  }

  var EmailIntervalMinutes = parseInt(document.getElementById("email_interval_minutes_"+clusterNo).value);
  if (CheckNumber(EmailIntervalMinutes,0,59) != 0){
    alert("에러: 이메일간격 분은 0에서 59범위이어야 합니다.");
    return [];
  }
  var EmailIntervalHours   = parseInt(document.getElementById("email_interval_hours_"+clusterNo).value);
  if (CheckNumber(EmailIntervalHours,0,23) != 0){
    alert("에러: 이메일간격 시간은 0에서 23범위이어야 합니다.");
    return [];
  }
  var EmailIntervalDays    = parseInt(document.getElementById("email_interval_days_"+clusterNo).value);
  if (CheckNumber(EmailIntervalDays,0,365) != 0){
    alert("에러: 이메일간격 날짜는 0에서 365범위이어야 합니다.");
    return [];
  }

  var EmailInterval = (EmailIntervalMinutes+(EmailIntervalHours*60)+(EmailIntervalDays*60*24));
  var EmailIntervalEnabled = GetCheckBoxValue("notify_email_"+clusterNo,0);

  if (CheckNumber(EmailInterval,1) != 0){
    EmailInterval = 1;
    if (EmailIntervalEnabled != 0){
      alert(sprintf("에러: 이메일간격은 0보다 커야합니다.. (네트워크 %s)",clusterName) );
      return [];
    }
  }

  args.push("setting_Email-Interval-"+clusterNo+":" + EmailInterval);

/* ---- */

  args.push("setting_Log-Enabled-"+clusterNo+":"  + GetCheckBoxValue("notify_log_"+clusterNo,0));

  for(var j=0; j<ShortNameArray.length; j++){
    args.push("setting_Log-Notify-"+LongNameArray[j]+"-"+clusterNo+":"       + GetSelectBoxValue('log_'+ShortNameArray[j]+'_'+clusterNo,0) );
  }

  for(var j=0; j<ShortNameArray.length; j++){
    args.push("setting_Log-Armed-"+LongNameArray[j]+"-"+clusterNo+":"        + GetCheckBoxValue("log_once_"+ShortNameArray[j]+"_"+clusterNo,0));
  }

  var LogIntervalMinutes = parseInt(document.getElementById("log_interval_minutes_"+clusterNo).value);
  if (CheckNumber(LogIntervalMinutes,0,59) != 0){
    alert("에러: 기록간격 분은 0에서 59 범위이어야 합니다.");
    return [];
  }
  var LogIntervalHours   = parseInt(document.getElementById("log_interval_hours_"+clusterNo).value);
  if (CheckNumber(LogIntervalHours,0,23) != 0){
    alert("에러: 기록간격 시간은 0에서 23 범위이어야 합니다.");
    return [];
  }
  var LogIntervalDays    = parseInt(document.getElementById("log_interval_days_"+clusterNo).value);
  if (CheckNumber(LogIntervalDays,0,365) != 0){
    alert("에러: 기록간격 날짜는 0에서 365 범위이어야 합니다.");
    return [];
  }

  var LogInterval = (LogIntervalMinutes+(LogIntervalHours*60)+(LogIntervalDays*60*24));
  var LogIntervalEnabled = GetCheckBoxValue("notify_log_"+clusterNo,0);

  if (CheckNumber(LogInterval,1) != 0){
    LogInterval = 1;
    if (LogIntervalEnabled != 0) {
      alert(sprintf("에러: 기록간격은 0보다 커야 합니다. (네트워크 %s)",clusterName) );
      return [];
    }
  }

  args.push("setting_Log-Interval-"+clusterNo+":" + LogInterval);

  return args;  
}

//-----------

//----------- output control functions -------------------------


var TimerHandleData = null;

var xmlhttpStatusData = null;
var StatusDataTimeout = 0;

var xmlhttpActions = null;

var ActionCount = 20;
var SettingsChanged = false;

var ModuleInfo = [];
var ChannelInfo = [];

var CurrentSavedSettings = [
  ["0" ,"0" ,"0" ,"0","0","0","0","0","1","80000","200000"],
  ["0" ,"0" ,"0" ,"0","0","0","0","0","1","80000","200000"],
  ["0" ,"0" ,"0" ,"0","0","0","0","0","1","80000","200000"],
  ["0" ,"0" ,"0" ,"0","0","0","0","0","1","80000","200000"],
  ["0" ,"0" ,"0" ,"0","0","0","0","0","1","80000","200000"],
  ["0" ,"0" ,"0" ,"0","0","0","0","0","1","80000","200000"],
  ["0" ,"0" ,"0" ,"0","0","0","0","0","1","80000","200000"],
  ["0" ,"0" ,"0" ,"0","0","0","0","0","1","80000","200000"],
  ["0" ,"0" ,"0" ,"0","0","0","0","0","1","80000","200000"],
  ["0","0","0","0","0","0","0","0","1","80000","200000"],
  ["0","0","0","0","0","0","0","0","1","80000","200000"],
  ["0","0","0","0","0","0","0","0","1","80000","200000"],
  ["0","0","0","0","0","0","0","0","1","80000","200000"],
  ["0","0","0","0","0","0","0","0","1","80000","200000"],
  ["0","0","0","0","0","0","0","0","1","80000","200000"],
  ["0","0","0","0","0","0","0","0","1","80000","200000"],
  ["0","0","0","0","0","0","0","0","1","80000","200000"],
  ["0","0","0","0","0","0","0","0","1","80000","200000"],
  ["0","0","0","0","0","0","0","0","1","80000","200000"],
  ["0","0","0","0","0","0","0","0","1","80000","200000"]
];
//-----------

function onTimeoutData()
{
  StatusDataTimeout = 0;
  xmlhttpStatusData.onreadystatechange = function() {}
  xmlhttpStatusData.abort();
}

//-----------

function onStateChangeData()
{
  if (xmlhttpStatusData != null){
    if (xmlhttpStatusData.readyState == 4){
      if (xmlhttpStatusData.status == 200){

        var Response = decodeURIComponent(xmlhttpStatusData.responseText);

        var SectionVars = [];

        var TimeoutStates = [];
        var OutputStates = [];

        SectionVars = Response.split("\x1d");
        if (SectionVars.length >= 1){
          OutputStates = SectionVars;
        }

        WriteOutputInfo(OutputStates);
        onTimeoutData();
      }
    }
  }
}

//-----------

function GetStateForModule(StatesArray,Module,Channel)
{
  for(var i=0; i<StatesArray.length; i++){
    if (StatesArray[i].length >= 5){
      var CurrentChannel = parseInt(StatesArray[i][3]);
      if ((Module[0] == StatesArray[i][0]) && (Module[1] == StatesArray[i][1]) && (Module[2] == StatesArray[i][2]) && (CurrentChannel == Channel)){
        return parseInt(StatesArray[i][4]);
      }
    }
  }
  return -1;
}

//-----------

function WriteOutputInfo(StatesArray)
{
  for(var i=0; i<StatesArray.length; i++){
    StatesArray[i] = StatesArray[i].split("\x1F");
  }
  for(var i=0; i<ActionCount; i++){
    var RowNr = (i+1);
    var Module = GetSelectBoxValue("modslot"+RowNr,"0/0/0");
    var Channel = GetSelectBoxValue("channel"+RowNr,-1);

    var State = GetStateForModule(StatesArray,Module.split("/"),parseInt(Channel));
    var StateText = "알수없음";

    switch (State){
      case 0: // off
        StateText = GetColorBallHtml(State)+" "+GetOnOffText(0);
        break;
      case 1: // on
        StateText = GetColorBallHtml(State)+" "+GetOnOffText(1);
        break;
    }
    SetInnerHtmlValue("state"+RowNr,StateText);
  }
}

//-----------

function PeriodicTimerUpdateStatusData()
{
  if (StatusDataTimeout > 0){
    StatusDataTimeout--;
    return;
  }

  if (xmlhttpStatusData != null){
    xmlhttpStatusData.abort();
  }
  
  var OutputGet = [];
  for(var i=0; i<ActionCount; i++){
    var RowNr = (i+1);
    
    var Module = GetSelectBoxValue("modslot"+RowNr,"0/0/0").split("/");
    for(var j=0; j<Module.length; j++){
      Module[j] = parseInt(Module[j]);
    }
    var Channel = parseInt(GetSelectBoxValue("channel"+RowNr,-1));
    
    if ((Module[0] != 0) && (Channel != -1) && (Module.length > 0)){
      OutputGet.push("output-state:"+Module[0]+":"+Module[1]+":"+Module[2]+":"+Channel);
    }
  }

  if (OutputGet.length > 0){
    var TotalParams = "data=" + OutputGet.join("+");
    xmlhttpStatusData = loadXMLDocASynch("data_srv.cgi", TotalParams, onStateChangeData, onTimeoutData);
    StatusDataTimeout = 10;
  }
}

//-----------

function InitializeJavascriptOutputControl()
{
  // start the timer(s)
  PeriodicTimerUpdateStatusData();

  var InternalRelay = [0,"Head Station relay 24V/0.25A",0x0001,0xFF00,1];
  var ModuleString = "";

  ModuleInfo.length = 0;
  ModuleInfo.push(InternalRelay);
  if (ModuleString.length > 0){
    var ModulesInfo = ModuleString.split("\x1E");
    for(var i=0; i<ModulesInfo.length; i++){
      ModuleInfo.push(ModulesInfo[i].split("\x1F"));
    }
  }

  var ChannelString = "";
  ChannelInfo.length = 0;
  ChannelInfo.push(["Rel 0"]);
  if (ChannelString.length > 0){
    var ChannelsInfo = ChannelString.split("\x1E");
    for(var i=0; i<ChannelsInfo.length; i++){
      ChannelInfo.push(ChannelsInfo[i].split("\x1F"));
    }
  }

  var AutoRefreshInterval = 1 * 1000;
  if (AutoRefreshInterval < 1000) AutoRefreshInterval = 1000;
  TimerHandleData = setInterval('PeriodicTimerUpdateStatusData()',AutoRefreshInterval);

  InitializeActionList();
  ApplySettingsToControls(CurrentSavedSettings);
}

//-----------

function AddCellsToRow(RowObj, RowNumber, LeftCellText, RightCellId)
{
  var RowMod = ((RowNumber+1) % 2);

  var CurrentCell1 = RowObj.insertCell(-1);
  CurrentCell1.className = "TableCell R"+RowMod+"Left";
  CurrentCell1.innerHTML = LeftCellText;

  var CurrentCell2 = RowObj.insertCell(-1);
  CurrentCell2.id = RightCellId;
  CurrentCell2.className = "TableCell R"+RowMod+"Left";
  CurrentCell2.innerHTML = "";
  CurrentCell2.style.width = "400px";
}

//-----------

function DynamicCreateRow(RowIdx,ModuleSlotText,ModuleSlotId)
{
  var TableObj = document.getElementById("ActionsList");
  if (TableObj == null) return null;
  
  var GotNetworkLicense = Math.min(4,4);
  var NwDisabledText = GetConditionalText(GotNetworkLicense > 0,"","disabled='disabled' ");
  var NwDisabled = [];
  NwDisabled.push(GetConditionalText(GotNetworkLicense >= 1,"","disabled='disabled' "));
  NwDisabled.push(GetConditionalText(GotNetworkLicense >= 2,"","disabled='disabled' "));
  NwDisabled.push(GetConditionalText(GotNetworkLicense >= 3,"","disabled='disabled' "));
  NwDisabled.push(GetConditionalText(GotNetworkLicense >= 4,"","disabled='disabled' "));

  var RowNr = (RowIdx+1);
  var RowObj = TableObj.insertRow(-1); // @ the end

  var ModuleSlotControlText = [];
  ModuleSlotControlText.push("<select id='modslot"+RowNr+"' style='width:200px' onchange='ModuleSlotSelectChange("+RowNr+")'>");
  ModuleSlotControlText.push("<option selected value='0/0/0'>없음</option>");
  for(var i=0; i<ModuleSlotText.length; i++){
    ModuleSlotControlText.push("<option value='"+ModuleSlotId[i]+"'>"+ModuleSlotText[i]+"</option>");
  }
  ModuleSlotControlText.push("</select>");

  var ChannelControlText = [];
  ChannelControlText.push("<select id='channel"+RowNr+"' style='width:60px' onchange='ChannelSelectChange("+RowNr+")'>");
  ChannelControlText.push("<option selected value='-1'>없음</option>");
  ChannelControlText.push("</select>");
  
  var StateControlText = [];
  StateControlText.push("<div id='state"+RowNr+"'>알수없음</div>");

  var ActionControlText = [];
  ActionControlText.push("<select id='action"+RowNr+"' style='width:110px' onchange='ActionSelectChange("+RowNr+")'>");
  ActionControlText.push("<option selected value='0'>없음</option>");
  ActionControlText.push("<option value='1'>수동으로</option>");
  ActionControlText.push("<option value='4'>시간 (24시간)</option>");
  ActionControlText.push("<option value='3' "+NwDisabledText+">프로피버스 이벤트</option>");
  ActionControlText.push("<option value='5'>시스템 이벤트</option>");
  ActionControlText.push("</select>");

  var ParamControlText = [];
  // manual on and off
  ParamControlText.push("<div id='div_manual"+RowNr+"' class='defaultHidden CfgTableIntDiv'>");
  ParamControlText.push("<table><tr><td>");
  ParamControlText.push("<input type='button' id='ManualOnButton"+RowNr+"' value='켜짐' onclick='ManualOnClick("+RowNr+")' style='width:80px'>");
  ParamControlText.push("</td><td>");
  ParamControlText.push("<input type='button' id='ManualOffButton"+RowNr+"' value='꺼짐' onclick='ManualOffClick("+RowNr+")' style='width:80px'>");
  ParamControlText.push("</td></tr></table>");
  ParamControlText.push("</div>");
  
  // on time on and off
  ParamControlText.push("<div id='div_time"+RowNr+"' class='defaultHidden CfgTableIntDiv'>");
  ParamControlText.push("<table><tr><td>");
  ParamControlText.push("정시에 (시,분,초):");
  ParamControlText.push("</td><td>");
  ParamControlText.push("<input type='text' value='8' size='1' maxlength='2' id='time_on_hours"+RowNr+"'>");
  ParamControlText.push("</td><td>");
  ParamControlText.push("<input type='text' value='0' size='1' maxlength='2' id='time_on_min"+RowNr+"'>");
  ParamControlText.push("</td><td>");
  ParamControlText.push("<input type='text' value='0' size='1' maxlength='2' id='time_on_sec"+RowNr+"'>");
  ParamControlText.push("</td></tr><tr><td>");
  ParamControlText.push("꺼짐 시간 (시,분,초):");
  ParamControlText.push("</td><td>");
  ParamControlText.push("<input type='text' value='20' size='1' maxlength='2' id='time_off_hours"+RowNr+"'>");
  ParamControlText.push("</td><td>");
  ParamControlText.push("<input type='text' value='0' size='1' maxlength='2' id='time_off_min"+RowNr+"'>");
  ParamControlText.push("</td><td>");
  ParamControlText.push("<input type='text' value='0' size='1' maxlength='2' id='time_off_sec"+RowNr+"'>");
  ParamControlText.push("</td></tr></table>");
  ParamControlText.push("</div>");
  
  // on profibus event on and off
  ParamControlText.push("<div id='div_pbevent"+RowNr+"' class='defaultHidden CfgTableIntDiv'>");
  ParamControlText.push("<table><tr><td>");
  ParamControlText.push("<select id='evt_pbtype"+RowNr+"' style='width:220px' "+NwDisabledText+">");
  ParamControlText.push("<option selected value='100'>스테이션 분실, 재시도 또는 유효하지 않음</option>");
  ParamControlText.push("<option value='0'>스테이션 분실</option>");
  ParamControlText.push("<option value='1'>끊김(Syncs)</option>");
  ParamControlText.push("<option value='2'>반복(Repeats)</option>");
  ParamControlText.push("<option value='3'>잘못된 데이터(Illegals)</option>");
  ParamControlText.push("<option value='4'>기본 진단 (Int. diag)</option>");
  ParamControlText.push("<option value='5'>요청된 진단 (Ext. diag)</option>");
  ParamControlText.push("<option value='6'>통신중 진단</option>");
  ParamControlText.push("<option value='7'>Controller lost</option>");
  ParamControlText.push("<option value='8'>전송속도 전환</option>");
  ParamControlText.push("<option value='9'>High/low signal (bargraph)</option>");
  ParamControlText.push("<option value='10'>이중화 실패</option>");
  ParamControlText.push("<option value='11'>PA/FF signal and levels</option>");
  ParamControlText.push("<option value='16'>High/low DP Idle voltage</option>");  
  ParamControlText.push("<option value='12'>Fiber optic signal change</option>");
  ParamControlText.push("<option value='13'>Fiber optic redundancy ring change</option>");
  ParamControlText.push("<option value='14'>Fiber optic signal failure</option>");
  ParamControlText.push("<option value='15'>Fiber optic redundancy ring failure</option>");
  ParamControlText.push("</select>");
  ParamControlText.push("</td></tr><tr><td>");
  ParamControlText.push("<select id='evt_network"+RowNr+"' style='width:220px' "+NwDisabledText+">");
  ParamControlText.push("<option selected value='0' "+NwDisabled[0]+">네트워크 1 (Network 1)</option>");
  ParamControlText.push("<option          value='1' "+NwDisabled[1]+">네트워크 2 (Network 2)</option>");
  ParamControlText.push("<option          value='2' "+NwDisabled[2]+">네트워크 3 (Network 3)</option>");
  ParamControlText.push("<option          value='3' "+NwDisabled[3]+">네트워크 4 (Network 4)</option>");
  ParamControlText.push("</select>");
  ParamControlText.push("</td></tr></table>");
  ParamControlText.push("</div>");
  
  // on system event on and off
  ParamControlText.push("<div id='div_sysevent"+RowNr+"' class='defaultHidden CfgTableIntDiv'>");
  ParamControlText.push("<table><tr><td>");
  ParamControlText.push("<select id='evt_systype"+RowNr+"' style='width:220px' >");
  ParamControlText.push("<option value='0'>Head Station redundant power change</option>");
  ParamControlText.push("<option value='2'>Power module events (Hardware revision V1.4 and newer)</option>");
  ParamControlText.push("<option value='1'>ComBricks system event</option>");
  ParamControlText.push("</select>");
  ParamControlText.push("</td></tr></table>");
  ParamControlText.push("</div>");

  // general boxes (for some events)
  ParamControlText.push("<div id='div_output"+RowNr+"' class='defaultHidden CfgTableIntDiv'>");
  ParamControlText.push("<table><tr><td align='right'>");

  ParamControlText.push("<select id='evt_output"+RowNr+"' style='width:220px' onchange='OutputSelectChange("+RowNr+")' "+NwDisabledText+">");
  ParamControlText.push("<option selected value='0'>Active high pulse</option>");
  ParamControlText.push("<option value='1'>Active low pulse</option>");
  ParamControlText.push("<option value='2'>뒤집힌 신호(Invert signal)</option>");
  ParamControlText.push("<option value='3'>Active high level</option>");
  ParamControlText.push("<option value='4'>Active low level</option>");
  ParamControlText.push("<option value='5'>Active high during event</option>");
  ParamControlText.push("<option value='6'>Active low during event</option>");
  ParamControlText.push("</select>");

  ParamControlText.push("</td></tr>");
  ParamControlText.push("<tr><td align='right'>");

  ParamControlText.push("<div id='div_hold"+RowNr+"'>");
  ParamControlText.push("펄스 지속 시간 (초): ");
  ParamControlText.push("<input type='text' value='1' size='4' id='evt_hold"+RowNr+"'>");
  ParamControlText.push("</div>");

  ParamControlText.push("<div id='div_reset"+RowNr+"'>");
  ParamControlText.push("트리거된 레벨 초기화: ");
  ParamControlText.push("<input type='button' id='ResetTriggerButton"+RowNr+"' value='Reset' onclick='ResetTriggeredClick("+RowNr+")' style='width:80px'>");
  ParamControlText.push("</div>");

  ParamControlText.push("</td></tr></table>");
  ParamControlText.push("</div>");

  var AlignArray = ["Center","Center","Center","Center","Center","Center"];
  var ContentArray = [RowNr,ModuleSlotControlText.join(""),ChannelControlText.join(""),StateControlText.join(""),ActionControlText.join(""),ParamControlText.join("")];

  for(var i=0; i<AlignArray.length; i++){
    var CurrentCell = RowObj.insertCell(-1);
    CurrentCell.className = "TableCell R"+(RowNr%2)+AlignArray[i];
    CurrentCell.innerHTML = ContentArray[i];
  }
}

//-----------

function ApplySettingsToControls(CurrentSettings)
{
  for(var i=0; i<ActionCount; i++){
    var CurrentActionVars = CurrentSettings[i];
    var RowNr = (i+1);
    var ModSlot = CurrentActionVars[0] + "/" + CurrentActionVars[1] + "/" + CurrentActionVars[2];
    SetSelectBoxValue("modslot"+RowNr      ,ModSlot);
    RefreshChannelsForModule(RowNr);
    SetSelectBoxValue("channel"+RowNr      ,CurrentActionVars[3]);
  }

  for(var i=0; i<ActionCount; i++){
    var CurrentActionVars = CurrentSettings[i];
    var RowNr = (i+1);

    SetSelectBoxValue("action"+RowNr       ,CurrentActionVars[4]);
    ActionChange(RowNr);

    if (parseInt(CurrentActionVars[4]) == 3){ // pb event
      SetSelectBoxValue("evt_pbtype"+RowNr     ,CurrentActionVars[5]);
    }
    if (parseInt(CurrentActionVars[4]) == 5){ // sys event
      SetSelectBoxValue("evt_systype"+RowNr     ,CurrentActionVars[5]);
    }
    
    SetSelectBoxValue("evt_network"+RowNr  ,CurrentActionVars[6]);
    SetSelectBoxValue("evt_output"+RowNr   ,CurrentActionVars[7]);
    OutputSelectChange(RowNr);

    SetTextValue("evt_hold"+RowNr          ,CurrentActionVars[8]);

    var OnTimeArr = BcdTimeToText(CurrentActionVars[9]);
    SetTextValue("time_on_hours"+RowNr,OnTimeArr[0]);
    SetTextValue("time_on_min"+RowNr  ,OnTimeArr[1]);
    SetTextValue("time_on_sec"+RowNr  ,OnTimeArr[2]);

    var OffTimeArr = BcdTimeToText(CurrentActionVars[10]);
    SetTextValue("time_off_hours"+RowNr,OffTimeArr[0]);
    SetTextValue("time_off_min"+RowNr  ,OffTimeArr[1]);
    SetTextValue("time_off_sec"+RowNr  ,OffTimeArr[2]);
  }
  
  CheckDuplicateChannels();
}

//-----------

function InitializeActionList()
{
  var ModuleSlotListText = [];
  var ModuleSlotListIds = [];

  // get all configurable modules, and add them in a list
  for(var i=0; i<ModuleInfo.length; i++){
    var CurrentId = ModuleInfo[i][2] + "/" + ModuleInfo[i][3] + "/" + ModuleInfo[i][0];

    var CurrentText = "카드 " + ModuleInfo[i][0] + " / " + ModuleInfo[i][1];
    if (i == 0){
      CurrentText = ModuleInfo[i][1];
      var DeviceName = 'ComBricks Head Station';
      if (DeviceName.length > 0){
        CurrentText = CurrentText + " (" + DeviceName + ")";
      }
    }
    else {
      var SlotTags = '';
      var SlotArray = SlotTags.split("\x1f");
      var CurrentSlotNr = parseInt(ModuleInfo[i][0]);
      var CurrentTagName = SlotArray[CurrentSlotNr-1];
      if (CurrentTagName.length > 0){
        CurrentText = CurrentText + " (" + CurrentTagName + ")";
      }
    }

    ModuleSlotListText.push(CurrentText);
    ModuleSlotListIds.push(CurrentId);
  }

  for(var i=0; i<ActionCount; i++){
    DynamicCreateRow(i,ModuleSlotListText,ModuleSlotListIds);
  }
}

//-----------

function RefreshChannelsForModule(RowNr)
{
  var ChannelId = "channel"+RowNr;
  var SelectedCardIndex = parseInt(GetSelectBoxIndex("modslot"+RowNr,0)) - 1;

  if ((ModuleInfo.length >= SelectedCardIndex) && (SelectedCardIndex >= 0)){
    var OldSelectedValue = GetSelectBoxValue(ChannelId,0);
    var OptionCount = ModuleInfo[SelectedCardIndex][4];
    ClearSelectBoxOptions(ChannelId);
    for(var i=0; i<OptionCount; i++){
      AddSelectBoxOption(ChannelId,ChannelInfo[SelectedCardIndex][i],i,i==OldSelectedValue);
    }
  }
  else {
    ClearSelectBoxOptions(ChannelId);
    AddSelectBoxOption(ChannelId,"없음",-1,true);
  }
}

//-----------

function CheckInvalidActions()
{
  for(var i=0; i<ActionCount; i++){
    var RowNr = (i+1);

    var ActionId  = "action"+RowNr;
    var ChannelId = "channel"+RowNr;

    // check action for row
    var SelectedChannel = GetSelectBoxValue(ChannelId,0);
  
    if (SelectedChannel < 0){
      // set action to none
      SetSelectBoxValue(ActionId,0); 
    }
    SetEnabled(ActionId,SelectedChannel >= 0);
    ActionChange(RowNr);
  }
}

//-----------

function ModuleSlotSelectChange(RowNr)
{
  for(var i=0; i<ActionCount; i++){
    var CurrentRowNr = (i+1);
    RefreshChannelsForModule(CurrentRowNr);
  }
  CheckDuplicateChannels(RowNr);
  SettingsChanged = true;
}

//-----------

function ChannelSelectChange(RowNr)
{
  for(var i=0; i<ActionCount; i++){
    var CurrentRowNr = (i+1);
    RefreshChannelsForModule(CurrentRowNr);
  }
  CheckDuplicateChannels(RowNr);
  SettingsChanged = true;
}

//-----------

function CheckDuplicateChannels(RowNrSpecial)
{
  var RemoveChannelsArray = [];
  
  for(var i=0; i<ActionCount; i++){
    var RowNr = (i+1);
    if (RowNr != RowNrSpecial){
      RemoveChannelsArray = CheckDuplicatesRow(RowNr,RemoveChannelsArray);
    }
  }
  
  if (RowNrSpecial != undefined){
    RemoveChannelsArray = CheckDuplicatesRow(RowNrSpecial,RemoveChannelsArray);
  }

  for(var i=0; i<RemoveChannelsArray.length; i++){
    var RowNr = RemoveChannelsArray[i][0];
    var Channel = RemoveChannelsArray[i][1];
    
    var ChannelId = "channel"+RowNr;
    var ActionId = "action"+RowNr;
    if (RemoveSelectBoxOption(ChannelId, Channel) == 0){
      // it it was the last channel, add a none option
      AddSelectBoxOption(ChannelId,"없음",-1,true);
    }
  }
  
  CheckInvalidActions();
}

//-----------

function RemoveChannel(RowNr,Channel, ExistingArray)
{
  RemoveSelectBoxOption("channel"+RowNr, Channel);
  var Arr = [RowNr,Channel];
  ExistingArray.push(Arr);
  return ExistingArray;
}

//-----------

function CheckDuplicatesRow(RowNr,ExistingArray)
{
  var Module = GetSelectBoxValue("modslot"+RowNr,-1);
  var Channel = parseInt(GetSelectBoxValue("channel"+RowNr,-1));
  if ((Module != -1) && (Channel != -1)){
    for(var i=0; i<ActionCount; i++){
      var CurrentRow = (i+1);
      var CurrentModule = GetSelectBoxValue("modslot"+CurrentRow,-1);
      var CurrentChannel = GetSelectBoxValue("channel"+CurrentRow,-1);
      if ((CurrentRow != RowNr) && (CurrentModule == Module)){
        ExistingArray = RemoveChannel(CurrentRow,Channel,ExistingArray);
      }
    }
  }
  return ExistingArray;
}

//-----------

function ActionChange(RowNr)
{
  var SelectedAction = parseInt(GetSelectBoxValue("action"+RowNr,"0"));
  SetVisibility("div_manual"+RowNr,SelectedAction == 1);
  SetVisibility("div_pbevent"+RowNr,SelectedAction == 3);
  SetVisibility("div_sysevent"+RowNr,SelectedAction == 5);
  SetVisibility("div_output"+RowNr,(SelectedAction == 3) || (SelectedAction == 5));
  SetVisibility("div_time"+RowNr,SelectedAction == 4);
}

//-----------

function ActionSelectChange(RowNr)
{
  ActionChange(RowNr);
  SettingsChanged = true;
}

//-----------

function OutputSelectChange(RowNr)
{
  var SelectedOutput = parseInt(GetSelectBoxValue("evt_output"+RowNr,"0"));
  
  SetVisibility("div_hold" +RowNr,(SelectedOutput == 0) || (SelectedOutput == 1));
  SetVisibility("div_reset"+RowNr,(SelectedOutput == 3) || (SelectedOutput == 4));
}

//-----------

function onTimeoutActions()
{
  xmlhttpActions.onreadystatechange = function() {}
  xmlhttpActions.abort();
}

//-----------

function onStateChangeActions()
{
  if (xmlhttpActions != null){
    if (xmlhttpActions.readyState == 4){
      if (xmlhttpActions.status == 200){

        var Response = decodeURIComponent(xmlhttpActions.responseText);

        var Result_arr = [];
        Result_arr = Response.split('\x1F');
        if (Result_arr.length == 2){
          if (parseInt(Result_arr[0]) != 200){
  	        alert(Result_arr[1]);
  	      }
        }

        onTimeoutActions();
      }
    }
  }
}

//-----------

function ManualOnClick(RowNr)
{
  if (SettingsChanged == true){
    var SaveResult = SaveSettings();
    if (SaveResult.Code != 200) return;
  }
  xmlhttpActions = loadXMLDocASynch("data_srv.cgi", "action=SetOutControl:"+RowNr+":1", onStateChangeActions, onTimeoutActions);
}

//-----------

function ManualOffClick(RowNr)
{
  if (SettingsChanged == true){
    var SaveResult = SaveSettings();
    if (SaveResult.Code != 200) return;
  }
  xmlhttpActions = loadXMLDocASynch("data_srv.cgi", "action=SetOutControl:"+RowNr+":0", onStateChangeActions, onTimeoutActions);
}

//-----------

function ResetTriggeredClick(RowNr)
{
  if (SettingsChanged == true){
    var SaveResult = SaveSettings();
    if (SaveResult.Code != 200) return;
  }
  var SelectedOutput = parseInt(GetSelectBoxValue("evt_output"+RowNr,"0"));
  
  var ResetValue = -1;
  if (SelectedOutput == 3) ResetValue = 0;
  if (SelectedOutput == 4) ResetValue = 1;
  if (ResetValue == -1) return;
  
  xmlhttpActions = loadXMLDocASynch("data_srv.cgi", "action=SetOutControl:"+RowNr+":"+ResetValue, onStateChangeActions, onTimeoutActions);
}

//----------- generic functions -------------------------

function SaveSettings()
{
  var args = [];

	// ------notification settings------
	
  for(var i=0; i<5; i++){
    if ((i == 4) || ((i < 4) && (i < ProfitraceLicense)) ){
  	  
  	  var clusterNo   = "C" + (i+1);
  	  var clusterName = ""  + (i+1);
  	  var ShortNamesArray = ShortNames;
  	  var LongNamesArray  = LongNames;
    	
    	if (i == 4){
  	    clusterNo   = "SYS";
  	    clusterName = "SYS";
  	    ShortNamesArray = ShortNamesSYS;
  	    LongNamesArray  = LongNamesSYS;
    	}
    	
    	var CurrentArgs = GatherSettingsFromNetwork(clusterNo, clusterName, ShortNamesArray, LongNamesArray);
    	if (CurrentArgs.length == 0) return; // error: do not continue...
    	args = args.concat(CurrentArgs);
    }
  }

	// -------output control settings--------

  for(var i=0; i<ActionCount; i++){
    var RowNr = (i+1);
    
    var CurrentModSlot = GetSelectBoxValue("modslot"+RowNr,"0/0/0").split("/");
    var CurrentChannel = parseInt(GetSelectBoxValue("channel"+RowNr,-1));
    var CurrentAction  = parseInt(GetSelectBoxValue("action"+RowNr,-1));

    args.push("setting_Out-Vendor"+RowNr+":"+ CurrentModSlot[0]);
    args.push("setting_Out-Module"+RowNr+":"+ CurrentModSlot[1]);
    args.push("setting_Out-Slot"+RowNr+":"+ CurrentModSlot[2]);
    args.push("setting_Out-Channel"+RowNr+":"+ CurrentChannel);
    args.push("setting_Out-Action"+RowNr+":"+ CurrentAction);

    switch(CurrentAction){
      case 4: // time params
        var CurrentOnHours   = parseInt(GetTextValue("time_on_hours"+RowNr,0),10);
        var CurrentOnMinutes = parseInt(GetTextValue("time_on_min"+RowNr,0),10);
        var CurrentOnSeconds = parseInt(GetTextValue("time_on_sec"+RowNr,0),10);
        var CurrentOnTime    = (CurrentOnHours * 10000) + (CurrentOnMinutes * 100) + CurrentOnSeconds;

        if (CheckNumber(CurrentOnHours,0,23) != 0){
          alert("에러: 타임켜짐-시간은 0에서 23 범위이어야 합니다.");
          return;
        }
        if (CheckNumber(CurrentOnMinutes,0,59) != 0){
          alert("에러: 타임켜짐-분은 0에서 59 범위이어야 합니다.");
          return;
        }
        if (CheckNumber(CurrentOnSeconds,0,59) != 0){
          alert("에러: 타임켜짐-초는 0에서 59 범위이어야 합니다.");
          return;
        }
        if (CheckNumber(CurrentOnTime,0,235959) != 0){
          alert("에러: 타임켜짐은 0:00:00에서 23:59:59 범위이어야 합니다.");
          return;
        }

        var CurrentOffHours   = parseInt(GetTextValue("time_off_hours"+RowNr,0),10);
        var CurrentOffMinutes = parseInt(GetTextValue("time_off_min"+RowNr,0),10);
        var CurrentOffSeconds = parseInt(GetTextValue("time_off_sec"+RowNr,0),10);
        var CurrentOffTime    = (CurrentOffHours * 10000) + (CurrentOffMinutes * 100) + CurrentOffSeconds;

        if (CheckNumber(CurrentOffHours,0,23) != 0){
          alert("에러: 타임꺼짐-시간은 0에서 23 범위이어야 합니다.");
          return;
        }
        if (CheckNumber(CurrentOffMinutes,0,59) != 0){
          alert("에러: 타임꺼짐-분은 0에서 59 범위이어야 합니다.");
          return;
        }
        if (CheckNumber(CurrentOffSeconds,0,59) != 0){
          alert("에러: 타임꺼짐-초는 0에서 59 범위이어야 합니다.");
          return;
        }
        if (CheckNumber(CurrentOffTime,0,235959) != 0){
          alert("에러: 타임꺼짐은 0:00:00에서 23:59:59 범위이어야 합니다.");
          return;
        }

        args.push("setting_Out-OnTime"+RowNr+":"+ CurrentOnTime);
        args.push("setting_Out-OffTime"+RowNr+":"+ CurrentOffTime);
        break;

      case 3: // pb event params
        var CurrentEvent   = GetSelectBoxValue("evt_pbtype"+RowNr,0);
        var CurrentNetwork = GetSelectBoxValue("evt_network"+RowNr,0);
        var CurrentOutput  = GetSelectBoxValue("evt_output"+RowNr,0);

        var CurrentHold = parseInt(GetTextValue("evt_hold"+RowNr,0),10);
        if (CheckNumber(CurrentHold,1,600) != 0){
          alert("에러: 유지시간(초)은 1에서 600 범위이어야 합니다.");
          return;
        }

        args.push("setting_Out-Event"+RowNr+":"+ CurrentEvent);
        args.push("setting_Out-Network"+RowNr+":"+ CurrentNetwork);
        args.push("setting_Out-OutState"+RowNr+":"+ CurrentOutput);
        args.push("setting_Out-HoldTime"+RowNr+":"+ CurrentHold);
        break;

      case 5: // sys event params
        var CurrentEvent   = GetSelectBoxValue("evt_systype"+RowNr,0);
        var CurrentOutput  = GetSelectBoxValue("evt_output"+RowNr,0);

        var CurrentHold = parseInt(GetTextValue("evt_hold"+RowNr,0),10);
        if (CheckNumber(CurrentHold,1,600) != 0){
          alert("에러: 유지시간(초)은 1에서 600 범위이어야 합니다.");
          return;
        }

        args.push("setting_Out-Event"+RowNr+":"+ CurrentEvent);
        args.push("setting_Out-OutState"+RowNr+":"+ CurrentOutput);
        args.push("setting_Out-HoldTime"+RowNr+":"+ CurrentHold);
        break;
    }
  }

  // send items to save....
  var Result = SaveSegmentedSettingsCombined("data_srv.cgi",args,"save-settings",1);
  
  if (Result.Code == 200){
    SettingsChanged = false;
  }
  return Result;
}