
window.onclick = function(event) 
{
	CheckMaintenanceEnableModalOnclick(event);
	CheckMaintenanceDisableModalOnclick(event);
} 


var TimerHandleData = null;

var xmlhttpStatusData = null;
var StatusDataTimeout = 0;

var xmlhttpStartRequestData = null;
var xmlhttpStopRequestData = null;

var xmlhttpFilelistRequestData = null;

var SelectedCluster = 0;
var MaxClusterCount = 4;

var MaxMessageCount = 8000;

var Baudrate = new Array(0,0,0,0);

var TriggersEnabled = [];
var MessagesBefore = [];
var MessagesAfter = [];
var AutoRetrigger = [];

var TriggerLicense = 0;

var ItemsPerPage = 10;
var CurrentPage = 0;

//-----------

function EnumerateDebugVars()
{
  var Result = [];

  Result.push("TimerHandleData="+TimerHandleData);
  Result.push("xmlhttpStatusData="+xmlhttpStatusData);
  Result.push("StatusDataTimeout="+StatusDataTimeout);

  Result.push("xmlhttpStartRequestData="+xmlhttpStartRequestData);
  Result.push("xmlhttpFilelistRequestData="+xmlhttpFilelistRequestData);
  Result.push("SelectedCluster="+SelectedCluster);
  Result.push("MaxClusterCount="+MaxClusterCount);
  Result.push("MaxMessageCount="+MaxMessageCount);
  Result.push("Baudrate="+Baudrate);
  Result.push("TriggersEnabled="+TriggersEnabled);
  Result.push("MessagesBefore="+MessagesBefore);
  Result.push("MessagesAfter="+MessagesAfter);
  Result.push("AutoRetrigger="+AutoRetrigger);

  Result.push("TriggerLicense="+TriggerLicense);

  return Result.join("<br>");
}

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

        var TraceStatus = [];
        var BusmonFiles = [];

        SectionVars = Response.split("\x1d");
        if (SectionVars.length >= 3){
          TraceStatus  = SectionVars[0].split("\x1F");
          Baudrate     = SectionVars[1].split("\x1F");
          BusmonFiles  = SectionVars[2].split("\x1E");
        }
        
        // splice busmonfiles to : cluster, total count, startindex
        var FilesCluster = parseInt(BusmonFiles[0]);
        var FilesTotal   = parseInt(BusmonFiles[1]);
        var FilesStart   = parseInt(BusmonFiles[2]);
        var FilesPrefix  = BusmonFiles[3];
        
        BusmonFiles.splice(0,4);

        WriteBusmonStatus(TraceStatus[0],TraceStatus[1],TraceStatus[2]);
        WriteBusmonFiles(FilesCluster,FilesTotal,FilesPrefix,BusmonFiles);
        CurrentPage = UpdatePages(FilesTotal,CurrentPage,ItemsPerPage);

        UpdateTabClasses(MaxClusterCount,SelectedCluster,Baudrate);

        onTimeoutData();
      }
    }
  }
}

//-----------

function GetStatusText(TraceStatus, TraceMessageCount)
{
  var Result = "Unknown";

  if ((TraceStatus & 0x40) != 0){
    var ErrorCode = (TraceStatus & 0x3F);

    switch(ErrorCode){
      case 0x01:
        Result = ("에러: 버스모니터 준비안됨.");
        break;
      case 0x02:
        Result = ("에러: 버스모니터 동작 에러.");
        break;
      case 0x03:
        Result = ("에러: 파일 저장 불가.");
        break;
      case 0x04:
        Result = ("에러: 버스모니터 통신 에러.");
        break;
      case 0x05:
        Result = ("에러: 버스모니터 설정 에러.");
        break;
      case 0x06:
        Result = ("이 네트워크에 메시지기록 라이센스 없음.");
        break;
      case 0x07:
        Result = ("에러: 파일 저장 불가, SD-카드 없음.");
        break;
      default:
        Result = sprintf("에러: 코드 %s",ErrorCode.toString(16) );
        break;
    }
  }
  else {
    switch(TraceStatus){

      case 0x01:
        Result = ("캡쳐 인터페이스 설정...");
        break;

      case 0x02:
        Result = ("트리거 대기중...");
        break;

      case 0x03:
        Result = ("메시지 대기중...");
        break;

      case 0x04:
        Result = sprintf("캡쳐중... (%s 메시지 캡쳐됨)",TraceMessageCount);
        break;

      case 0x05:
        Result = sprintf("저장중... (%s 캡쳐된 메시지)",TraceMessageCount);
        break;

      case 0x06:
        Result = ("Maintenance mode is active");
        break;

      case 0x81:
        Result = sprintf("완료: 캡쳐된 메시지",TraceMessageCount);
        break;

      case 0x82:
        Result = ("취소됨.");
        break;

      default:
        Result = ("활성화되지 않은.");
        break;
    }
  }

  return Result;
}

//-----------

function GetStatusTextSummary(TraceStatus)
{
  var Result = "Unknown";

  if ((TraceStatus & 0x40) != 0){
    var ErrorCode = (TraceStatus & 0x3F);

    switch(ErrorCode){
      case 0x01:
        Result = ("에러: 버스모니터 준비안됨");
        break;
      case 0x02:
        Result = ("에러: 버스모니터 동작 에러");
        break;
      case 0x03:
        Result = ("에러: 파일 저장 불가");
        break;
      case 0x04:
        Result = ("에러: 버스모니터 통신 에러");
        break;
      case 0x05:
        Result = ("에러: 버스모니터 설정 에러");
        break;
      case 0x06:
        Result = ("이 네트워크에 메시지기록 라이센스 없음");
        break;
      case 0x07:
        Result = ("에러: 파일 저장 불가, SD-카드 없음");
        break;
      default:
        Result = sprintf("에러: 코드 %s",ErrorCode.toString(16) );
        break;
    }
  }
  else {
    switch(TraceStatus){

      case 0x01:
        Result = ("캡쳐인터페이스를 설정하는 동안 중단됨");
        break;

      case 0x02:
        Result = ("기록시작을 기다리는 동안 중단됨");
        break;

      case 0x03:
        Result = ("메시지를 기다리는 동안 중단됨");
        break;

      case 0x04:
        Result = ("캡쳐하는 동안 중단됨");
        break;

      case 0x05:
        Result = ("저장하는 동안 중단됨");
        break;

      case 0x81:
        Result = ("정상 완료");
        break;

      case 0x82:
        Result = ("취소됨");
        break;

      default:
        Result = ("활성화되지 않은");
        break;
    }
  }

  return Result;
}


//-----------

function WriteBusmonStatus(TraceStatus, TraceMessageCount, PreviousStatus)
{
  TraceStatus       = parseInt(TraceStatus);
  TraceMessageCount = parseInt(TraceMessageCount);
  PreviousStatus    = parseInt(PreviousStatus);

  var CurrentStatusMessage  = GetStatusText(TraceStatus,TraceMessageCount);
  var PreviousStatusMessage = GetStatusTextSummary(PreviousStatus);
  
  var EnableTriggerControls = false;
  if ((TraceStatus & 0x80) != 0) EnableTriggerControls = true;
  if ((TraceStatus       ) == 0) EnableTriggerControls = true;
  EnableDisableTriggersControls(EnableTriggerControls);

  var StatusMessage = CurrentStatusMessage;
  if (PreviousStatus != 0){
    StatusMessage = StatusMessage + " <br><div class='NotImportantText'>(이전의 캡쳐: " + PreviousStatusMessage + ")</div>";
  }
  SetInnerHtmlValue('StatusArea',StatusMessage);
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

  var DataParams     = "data=MessageTraceStatus:"+SelectedCluster+"+Baudrate+busmonfiles:"+SelectedCluster+":"+(CurrentPage*ItemsPerPage)+":"+ItemsPerPage;
  xmlhttpStatusData = loadXMLDocASynch("data_srv.cgi", DataParams, onStateChangeData, onTimeoutData);
  StatusDataTimeout = 10;
}


//-----------

function EnableDisableMsgBefore(SelectedClusterIndex)
{
  var CurrentCluster = SelectedCluster;
  if (SelectedClusterIndex != undefined) CurrentCluster = SelectedClusterIndex;

  if (GenerateTriggerValueFromControls() != 0) {
    if (GetEnabled('msg_count_before',false) == false){
      SetEnabled('msg_count_before',true);
      SetTextValue('msg_count_before',MessagesBefore[CurrentCluster]);
    }
  }
  else {
    SetEnabled('msg_count_before',false);
    MessagesBefore[CurrentCluster] = GetMessageCountBefore();
    SetTextValue('msg_count_before',0);
  }
  
  CheckMessagesValue('msg_count_before','msg_count_after');
}

//-----------

function EnableDisableTriggersControls(Enable)
{
  if (GenerateTriggerValueFromControls() != 0) {
    SetEnabled('msg_count_before',Enable);
  }
  else {
    SetEnabled('msg_count_before',false);
  }
  
  SetEnabled('msg_count_after' ,Enable);  

  SetEnabled('syncs_trigger'   ,Enable);  
  SetEnabled('repeats_trigger' ,Enable);  
  SetEnabled('illegals_trigger',Enable);  
  SetEnabled('lost_trigger'    ,Enable);  
  SetEnabled('indi_trigger'    ,Enable);  
  SetEnabled('exdi_trigger'    ,Enable);  
  SetEnabled('dxdi_trigger'    ,Enable);  
    
}

//-----------

function GenerateTriggerValueFromControls()
{
  var Triggers = 0;
  if (GetCheckBoxValue("syncs_trigger",0)    != 0) Triggers |= 0x01;
  if (GetCheckBoxValue("repeats_trigger",0)  != 0) Triggers |= 0x02;
  if (GetCheckBoxValue("illegals_trigger",0) != 0) Triggers |= 0x04;
  if (GetCheckBoxValue("lost_trigger",0)     != 0) Triggers |= 0x08;
  if (GetCheckBoxValue("indi_trigger",0)     != 0) Triggers |= 0x10;
  if (GetCheckBoxValue("exdi_trigger",0)     != 0) Triggers |= 0x20;
  if (GetCheckBoxValue("dxdi_trigger",0)     != 0) Triggers |= 0x40;
  return Triggers;
}

//-----------

function SetTriggerValueToControls(TriggerSettings)
{
  SetCheckBoxValue("syncs_trigger"   ,(TriggerSettings & 0x01) != 0);
  SetCheckBoxValue("repeats_trigger" ,(TriggerSettings & 0x02) != 0);
  SetCheckBoxValue("illegals_trigger",(TriggerSettings & 0x04) != 0);
  SetCheckBoxValue("lost_trigger"    ,(TriggerSettings & 0x08) != 0);
  SetCheckBoxValue("indi_trigger"    ,(TriggerSettings & 0x10) != 0);
  SetCheckBoxValue("exdi_trigger"    ,(TriggerSettings & 0x20) != 0);
  SetCheckBoxValue("dxdi_trigger"    ,(TriggerSettings & 0x40) != 0);
}

//-----------


function GetMessageCountBefore()
{
  var MsgCountBefore = parseInt(GetTextValue('msg_count_before',"4000"));
  return MsgCountBefore;
}

//-----------

function GetMessageCountAfter()
{
  var MsgCountAfter  = parseInt(GetTextValue('msg_count_after',"4000"));
  return MsgCountAfter;
}

//-----------

function GetAutoRetrigger()
{
  return GetCheckBoxValue("auto_retrigger",0);
}

//-----------

function SetTriggersAndMessages(SelectedClusterIndex, OldClusterIndex)
{
  if (SelectedClusterIndex >= TriggersEnabled.length) return;
  if (SelectedClusterIndex < 0) return;

  // store old cluster settings, keep in variable
  if (OldClusterIndex >= 0){
    if (OldClusterIndex < TriggersEnabled.length){
      TriggersEnabled[OldClusterIndex] = GenerateTriggerValueFromControls();
      if (GetEnabled('msg_count_before',false) == true){
        MessagesBefore[OldClusterIndex]  = GetMessageCountBefore();
      }
      MessagesAfter[OldClusterIndex]   = GetMessageCountAfter();
      AutoRetrigger[OldClusterIndex]   = GetAutoRetrigger();
    }
  }

  // apply new cluster settings...
  SetTriggerValueToControls(TriggersEnabled[SelectedClusterIndex]);
  SetTextValue("msg_count_before",MessagesBefore[SelectedClusterIndex]);
  SetTextValue("msg_count_after",MessagesAfter[SelectedClusterIndex]);
  SetCheckBoxValue("auto_retrigger",AutoRetrigger[SelectedClusterIndex]);

  EnableDisableMsgBefore(SelectedClusterIndex);
}

//-----------


function InitializeJavascript()
{
  TriggerLicense = Math.min(4,4);

  // set checked values
  TriggersEnabled.push( parseInt("111") );
  TriggersEnabled.push( parseInt("14") );
  TriggersEnabled.push( parseInt("14") );
  TriggersEnabled.push( parseInt("14") );

  MessagesBefore.push( parseInt("1000") );
  MessagesBefore.push( parseInt("1000") );
  MessagesBefore.push( parseInt("1000") );
  MessagesBefore.push( parseInt("1000") );

  MessagesAfter.push( parseInt("1000") );
  MessagesAfter.push( parseInt("1000") );
  MessagesAfter.push( parseInt("1000") );
  MessagesAfter.push( parseInt("1000") );

  AutoRetrigger.push( parseInt("1") );
  AutoRetrigger.push( parseInt("1") );
  AutoRetrigger.push( parseInt("1") );
  AutoRetrigger.push( parseInt("1") );

  // restore global vars
  var SelectedClusterIndex = GetGlobalInt('network',0);
  SetTriggersAndMessages(0, -1); // init
  ClusterTabClick( SelectedClusterIndex ,1);

  // start the timer(s)
  ClusterTabClick(0,0);

  var AutoRefreshInterval = 1 * 1000;
  if (AutoRefreshInterval < 1000) AutoRefreshInterval = 1000;
  TimerHandleData = setInterval('PeriodicTimerUpdateStatusData()',AutoRefreshInterval);
}

//-----------

function StartTrace()
{
  var MsgCountBefore = GetMessageCountBefore();
  var MsgCountAfter  = GetMessageCountAfter();
  var AutoRetrigger  = GetAutoRetrigger();

  var Triggers = GenerateTriggerValueFromControls();
  var RequiredMessagesBefore = 0;
  if (Triggers & 0xA) RequiredMessagesBefore = 2;
  var RequiredMessagesAfter = 2;
  
  var HalfMaxMessageCount = (MaxMessageCount/2);

  if (CheckNumber(MsgCountBefore,RequiredMessagesBefore,HalfMaxMessageCount) != 0){
    alert(sprintf("Error: The number of messages before the trigger must be between %s and %s. You have selected %s.",RequiredMessagesBefore,HalfMaxMessageCount,MsgCountBefore) );
    return;
  }

  if (CheckNumber(MsgCountAfter,RequiredMessagesAfter,HalfMaxMessageCount) != 0){
    alert(sprintf("Error: The number of messages after the trigger must be between %s and %s. You have selected %s.",RequiredMessagesAfter,HalfMaxMessageCount,MsgCountAfter) );
    return;
  }

  if (CheckNumber(MsgCountBefore+MsgCountAfter,0,MaxMessageCount) != 0){
    alert(sprintf("에러: 기록될 수 있는 메시지의 최대 숫자는 %s입니다.  %s를 선택하셨습니다.",MaxMessageCount,MsgCountBefore+MsgCountAfter) );
    return;
  }

  var Triggers = GenerateTriggerValueFromControls();
  var ActionParams = "action=StartMessageTrace:"+SelectedCluster+":"+Triggers+":"+MsgCountBefore+":"+MsgCountAfter+":"+AutoRetrigger;
  xmlhttpStartRequestData = loadXMLDocASynch("data_srv.cgi", ActionParams, onStateChangeStartRequestData, onTimeoutStartRequestData);
}

//-----------

function onTimeoutStartRequestData()
{
  xmlhttpStartRequestData.onreadystatechange = function() {}
  xmlhttpStartRequestData.abort();
}

//-----------

function onStateChangeStartRequestData()
{
  if (xmlhttpStartRequestData != null){
    if (xmlhttpStartRequestData.readyState == 4){
      if (xmlhttpStartRequestData.status == 200){

        var Response = decodeURIComponent(xmlhttpStartRequestData.responseText);

        var TraceStatus = [];
        TraceStatus  = Response.split("\x1F");;

        if (TraceStatus[0] == 200){
          var StatusBits = parseInt(TraceStatus[1]);

					if ((StatusBits & 0x10) != 0){ //  busmon in maintenance mode
						alert("The busmonitor of this network is in maintenance mode, disable maintenance mode before starting the busmonitor.");
					}
					else if ((StatusBits & 0x08) != 0){ //  not started busmon, busy
            alert("버스모니터는 이미 시작되었습니다. 실행중지시키고 재시작해주십시오.");
          }
          else if ((StatusBits & 0x02) == 0){//   mmc present
            alert("경고: 파일을 저장하기위한 SD-카드가 시스템에 존재하지 않습니다.");
          }
          else if ((StatusBits & 0x01) == 0){ //  not started busmon
            alert("에러: 버스모니터 시작 불가");
          }
        }
        else {
          alert(TraceStatus[1]);
        }

        onTimeoutStartRequestData();
      }
    }
  }
}

//-----------

function StopTrace()
{
  var ActionParams = "action=StopMessageTrace:"+SelectedCluster;
  xmlhttpStopRequestData = loadXMLDocASynch("data_srv.cgi", ActionParams, onStateChangeStopRequestData, onTimeoutStopRequestData);
}

//-----------
function onTimeoutStopRequestData()
{
  xmlhttpStopRequestData.onreadystatechange = function() {}
  xmlhttpStopRequestData.abort();
}

//-----------

function onStateChangeStopRequestData()
{
  if (xmlhttpStopRequestData != null){
    if (xmlhttpStopRequestData.readyState == 4){
      if (xmlhttpStopRequestData.status == 200){
        var Response = decodeURIComponent(xmlhttpStopRequestData.responseText);
        /* no action taken */
        onTimeoutStopRequestData();
      }
    }
  }
}

//-----------

function GenerateTriggerWarning()
{
  if (TriggerLicense <= 0){
    return "메시지 기록 라이센스가 없습니다.";
  }
  return sprintf("네트워크 %s용 메시지 기록 라이센스만 갖고 있습니다.",GenerateEnumeration(1,TriggerLicense) );
}

//-----------

function ClusterTabClick(ClusterNo, FromInitFunction)
{
  var Warnings = [];

  if (TriggerLicense < (ClusterNo+1)){
    Warnings = AddWarning(Warnings,GenerateTriggerWarning());
    SetEnabled("startbutton",false);
    SetEnabled("stopbutton",false);
  }
  else {
    SetEnabled("startbutton",true);
    SetEnabled("stopbutton",true);
  }

  DisplayWarnings(Warnings);

  //-----------------
  SetTriggersAndMessages(ClusterNo,SelectedCluster);
  SelectedCluster = ClusterNo;
  SetGlobalVar('network',SelectedCluster);

  UpdateTabClasses(MaxClusterCount,SelectedCluster,Baudrate);
  if (FromInitFunction != 1) PeriodicTimerUpdateStatusData();
}

//-----------

function CheckMessagesValue(ctrl_before, ctrl_after, RequiredBefore, RequiredAfter)
{
  var BeforeObj = document.getElementById(ctrl_before);
  var AfterObj = document.getElementById(ctrl_after);
  
  if ((BeforeObj == null) || (AfterObj == null)) return;

  var Triggers = GenerateTriggerValueFromControls();
  var RequiredBefore = 0;
  if (Triggers & 0xA) RequiredBefore = 2;
  var RequiredAfter = 2;

  var BeforeValue = parseInt(GetTextValue(ctrl_before,0));
  var AfterValue = parseInt(GetTextValue(ctrl_after,0))
  
  if ((BeforeValue+AfterValue) > MaxMessageCount){
    BeforeObj.style.color = "#FF0000";
    AfterObj.style.color  = "#FF0000";
  }
  else {
    var HalfMaxMessageCount = (MaxMessageCount/2);
    if ((BeforeValue < RequiredBefore) || (BeforeValue > HalfMaxMessageCount)){
      BeforeObj.style.color = "#FF0000";
    }
    else {
      BeforeObj.style.color = "#000000";
    }
    
    if ((AfterValue < RequiredAfter) || (AfterValue > HalfMaxMessageCount)){
      AfterObj.style.color = "#FF0000";
    }
    else {
      AfterObj.style.color = "#000000";
    }
  }
}

//-------------------------------------------------------------------------------
//-------------------------------------------------------------------------------
//-------------------------------------------------------------------------------
//-------------------------------------------------------------------------------
//-------------------------------------------------------------------------------
//-------------------------------------------------------------------------------
//-------------------------------------------------------------------------------
//-------------------------------------------------------------------------------

function WriteBusmonFiles(FilesCluster,FilesTotal,FilesPrefix,FileListArray)
{
  var TableObj = document.getElementById("CapturedFiles");
  if (TableObj == null) return;
  
  for(var i=0; i<FileListArray.length; i++){
    FileListArray[i] = FileListArray[i].split("\x1F");
    if (FileListArray[i].length < 6){
      FileListArray.splice(i,1);
      i--;
    }
  }
  
  // empty list
  if (FileListArray.length == 1){
    if (FileListArray[0].length == 0){
      FileListArray.pop();
    }
  }

  // determine row count
  var ContentRowCount = FileListArray.length;
  if (ContentRowCount < 1) ContentRowCount = 1;
  var TableRowCount = (ContentRowCount + 1); // header row always there

  while (TableObj.rows.length < TableRowCount){
  	// too little rows for content: add rows to end of table
  	AddRow(TableObj,1, new Array("Left","Center","Center","Center","Center","Center"));
  }

  while (TableObj.rows.length > TableRowCount){
  	// too much rows for content: remove rows from end of table
  	RemoveRow(TableObj,1);
  }

  // fill the rows
  if (FileListArray.length > 0){
	  for(var i=0; i<ContentRowCount; i++){
		  FillBusmonFileRow(i,FilesPrefix,FilesCluster,FileListArray[i]);
	  }
	}
	else {
    FillBusmonFileRow(0,"",-1, new Array("발견된 파일 없음"));
	}

	FixFooter();
}

//-----------

function TriggerToText(EventValue)
{
  if (EventValue == 0) return "트리거 없음";

  var Result = [];

  if (EventValue & 0x0001) Result.push("끊김(Syncs)");
  if (EventValue & 0x0002) Result.push("반복(Repeats)");
  if (EventValue & 0x0004) Result.push("잘못된 데이터(Illegals)");
  if (EventValue & 0x0008) Result.push("분실(Lost)");
  if (EventValue & 0x0010) Result.push("기본 진단 (Int. diag)");
  if (EventValue & 0x0020) Result.push("요청된 진단 (Ext. diag)");
  if (EventValue & 0x0040) Result.push("데이타 통신중 진단");

  return Result.join(", ");
}

//-----------

function GenerateFileName(Prefix, Cluster, SequenceNumber)
{
  var Filename = Prefix+"_Nw"+(Cluster+1)+"_"+SequenceNumber+".ptc";
  return Filename;
}

//-----------

function DeleteFile(Cluster, SeqNr)
{
  var ActionParams = "action=deletebusmonfile:"+Cluster+":"+SeqNr;
  var Response = loadXMLDocSynch("data_srv.cgi", ActionParams, null);
  
  Response = decodeURIComponent(Response);
  var ResponseArray = Response.split("\x1F");
  
  var ResponseValue = parseInt(ResponseArray[0]);
  var ResponseText  = ResponseArray[1];
  
  if (ResponseValue != 200){
    alert(ResponseText);
  }
}

//-----------

function DeleteAllFiles()
{
  if (confirm("이 네트워크의 모든 메시지 파일을 제거하시겠습니까?") != 0){
    var ActionParams = "action=deleteallbusmonfiles:"+SelectedCluster;
    var Response = loadXMLDocSynch("data_srv.cgi", ActionParams, null);

    Response = decodeURIComponent(Response);
    var ResponseArray = Response.split("\x1F");
    
    var ResponseValue = parseInt(ResponseArray[0]);
    var ResponseText  = ResponseArray[1];
    
    if (ResponseValue != 200){
      alert(ResponseText);
    }
  }
}

//-----------

function ModifyDataRowToTableContents(Prefix,Cluster,BusmonFileDataArray)
{
  var Result = [];
  if (BusmonFileDataArray.length == 6){
    var SeqNumber  = parseInt(BusmonFileDataArray[0]);
    var FileDate   = BusmonFileDataArray[1];
    var FileSize   = parseInt(BusmonFileDataArray[2]);
    var MsgBefore  = parseInt(BusmonFileDataArray[3]);
    var MsgAfter   = parseInt(BusmonFileDataArray[4]);
    var MsgTrigger = parseInt(BusmonFileDataArray[5]);
    
    var Filename = GenerateFileName(Prefix,Cluster,SeqNumber);
    var Filepath = "mmc$\\Busmon\\Nw"+(Cluster+1)+"\\"+Filename;

    Result.push("<a class='alink' href='"+Filepath+"'>"+Filename+"</a>");
    
    if ((MsgAfter == 0) && (MsgBefore == 0) && (MsgTrigger == 0)){
      Result.push("-");
      Result.push("-");
    }
    else {
      if (MsgTrigger == 0){ // no trigger
        Result.push(MsgAfter);
      }
      else {
        Result.push(MsgBefore+"/"+MsgAfter);
      }
      Result.push(TriggerToText(MsgTrigger));
    }
    Result.push(parseInt(FileSize/1024)+" KB");
    Result.push(FileDate);
    Result.push("<input type='button' value='삭제' onClick='DeleteFile("+Cluster+","+SeqNumber+")'>");
  }
  else {
    Result.push(BusmonFileDataArray[0]);
    Result.push("");
    Result.push("");
    Result.push("");
    Result.push("");
    Result.push("");
  }


  return Result;
}

//-----------

function FillBusmonFileRow(RowNr, FilesPrefix, Cluster,BusmonFileData)
{
  var CellData = ModifyDataRowToTableContents(FilesPrefix,Cluster,BusmonFileData);

  if (CellData.length > 1){
    for(var i=0; i<CellData.length; i++){
      FillBusmonFileCell(RowNr, i, CellData[i]);
    }
  }
}

//-----------

function FillBusmonFileCell(RowNr, CellNr, Context)
{
	var CellId = "row" + (RowNr+1) + "_" + (CellNr);
	SetInnerHtmlValue(CellId,Context);
}

//-----------


function UpdatePages(TotalFiles,PageIdx,StationsPerPage)
{
  TotalFiles = parseInt(TotalFiles);
  var PageCount = Math.ceil(TotalFiles / StationsPerPage);
  var HtmlInsideDiv = "<div style='width:160px;text-align:center' class='VariableWx'>모든 파일: "+TotalFiles+"</div>";

  if (PageCount > 0){
    HtmlInsideDiv = HtmlInsideDiv + "<div style='width:50px;text-align:center' class='VariableWx'>페이지:</div>";
  }

  var PageButtonArray = [];
  for(var PageIndex=0; PageIndex < PageCount; PageIndex++){
    PageButtonArray.push((PageIndex+1).toString(10));
  }

  while((PageButtonArray.length <= PageIdx) && (PageIdx > 0)){
    PageIdx--;
  }
  PageButtonArray = ReducePages(PageButtonArray,PageIdx);

  var AllowDisplayDots = 1;
  for(var PageIndex=0; PageIndex< PageCount; PageIndex++){
    var CurrentItem = PageButtonArray[PageIndex];
    if (CurrentItem.length > 0){
      if (PageIndex == CurrentPage){
        HtmlInsideDiv = HtmlInsideDiv + "<div style='cursor: pointer;width:36px;text-align:center;font-weight:bold;text-decoration:underline;' class='VariableWx' onClick='UpdateSelectedPage("+PageIndex+")'>"+CurrentItem+"</div>";
      }
      else {
        HtmlInsideDiv = HtmlInsideDiv + "<div style='cursor: pointer;width:36px;text-align:center;font-weight:bold;' class='VariableWx' onClick='UpdateSelectedPage("+PageIndex+")'>"+CurrentItem+"</div>";
      }
      AllowDisplayDots = 1;
    }
    else {
      if (AllowDisplayDots != 0){
        HtmlInsideDiv = HtmlInsideDiv + "<div class='VariableWx' style='width:38px;text-align:center'>...</div>";
        AllowDisplayDots = 0;
      }
    }
  }

  SetInnerHtmlValue('PagesArea',HtmlInsideDiv);
  return PageIdx;
}

//-----------

function UpdateSelectedPage(NewPage)
{
  if (NewPage < 0) return;
  CurrentPage = NewPage;
  PeriodicTimerUpdateStatusData();
}

//-----------

function DownloadOverviewClick()
{
  var LogUrl = "/RecordedMessagesNetwork"+(SelectedCluster+1)+".csv" + "?ts="+Date().toLocaleString();
  window.open(LogUrl);
}
