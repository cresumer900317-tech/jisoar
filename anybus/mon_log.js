
window.onclick = function(event) 
{
	CheckMaintenanceEnableModalOnclick(event);
	CheckMaintenanceDisableModalOnclick(event);
} 

var TimerHandleData = null;

var xmlhttpStatusData = null;
var StatusDataTimeout = 0;

var xmlhttpClearLog = null;

var MaxClusterCount = 4;
var SelectedCluster = 0;

var SelectedPage = 0;
var LinesPerPage = 20;
var FlippedOrder = 1; // default descending
var FirstRun = 1;

var LogLinesPerCluster = new Array(0,0,0,0);

var NetworkLicense = 0;

//-----------

function EnumerateDebugVars()
{
  var Result = [];

  Result.push("TimerHandleData="+TimerHandleData);
  Result.push("xmlhttpStatusData="+xmlhttpStatusData);
  Result.push("StatusDataTimeout="+StatusDataTimeout);

  Result.push("xmlhttpClearLog="+xmlhttpClearLog);
  Result.push("MaxClusterCount="+MaxClusterCount);
  Result.push("SelectedCluster="+SelectedCluster);
  Result.push("SelectedPage="+SelectedPage);
  Result.push("LinesPerPage="+LinesPerPage);
  Result.push("FlippedOrder="+FlippedOrder);
  Result.push("FirstRun="+FirstRun);

  Result.push("LogLinesPerCluster="+LogLinesPerCluster);
  Result.push("NetworkLicense="+NetworkLicense);

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

        var ControlVars = [];

        ControlVars = Response.split("\x1D");

        var CurrentTime = "";
        var CurrentCluster = SelectedCluster;
        var CurrentPage = 0;
        var SortedMode = 0;
        var DataLines = "";

        if (ControlVars.length >= 6){
          CurrentCluster     = parseInt(ControlVars[0]);
          CurrentPage        = parseInt(ControlVars[1]);
          SortedMode         = parseInt(ControlVars[2]);
          CurrentTime        = ControlVars[3];
          LogLinesPerCluster[CurrentCluster] = ControlVars[4]; // only selected cluster line count is updated
          DataLines          = ControlVars[5];
        }

        UpdateRefreshTime(CurrentTime,LogLinesPerCluster[CurrentCluster]);
        SetUpPages(LogLinesPerCluster[CurrentCluster],CurrentPage,LinesPerPage);
        if (FirstRun == 0) FillLogTable(LogLinesPerCluster[CurrentCluster],CurrentPage,DataLines,LinesPerPage,SortedMode);
        FirstRun = 0;

        UpdateTabClasses(MaxClusterCount,SelectedCluster, null);

        onTimeoutData();
      }
    }
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

  var CalculatedOffset = (SelectedPage*LinesPerPage);
  var CalculatedCount = (LinesPerPage);

  if (FlippedOrder != 0){
    CalculatedOffset = LogLinesPerCluster[SelectedCluster] - (LinesPerPage*(SelectedPage+1));
    if (CalculatedOffset < 0){
      CalculatedCount += CalculatedOffset;
      CalculatedOffset = 0;
    }
  }
  else {
    if ((CalculatedOffset+CalculatedCount) > LogLinesPerCluster[SelectedCluster]){
      CalculatedCount = (LogLinesPerCluster[SelectedCluster] - CalculatedOffset);
    }
  }

  var ReturnParams   = "return="+SelectedCluster+"+"+SelectedPage+"+"+FlippedOrder;
  var PropertyParams = "property=Time";
  var DataParams     = "data=LogTotalLines:"+SelectedCluster+"+LogLine:"+CalculatedOffset+":"+(CalculatedOffset+CalculatedCount)+":"+SelectedCluster;
  var TotalParams    = ReturnParams + "&" + PropertyParams + "&" + DataParams;

  xmlhttpStatusData = loadXMLDocASynch("data_srv.cgi",TotalParams, onStateChangeData, onTimeoutData);

  StatusDataTimeout = 10;
}


//-----------

function InitializeJavascript()
{
  NetworkLicense = 4;

  //-------------------------

  StatusDataTimeout = 0;

  var SelectedClusterIndex = GetGlobalInt('network',0);
  ClusterTabClick( SelectedClusterIndex ,1);

  FlippedOrder = GetGlobalInt('sorting',1);

  // start the timer(s)
  ClusterTabClick(0,0);

  var AutoRefreshInterval = 1 * 1000;
  if (AutoRefreshInterval < 1000) AutoRefreshInterval = 1000;
  TimerHandleData = setInterval('PeriodicTimerUpdateStatusData()',AutoRefreshInterval);
}

//-----------

function UpdateRefreshTime(TimeString, total_lines_this_cluster)
{
  if (total_lines_this_cluster == 1){
    var Value = sprintf("마지막갱신: %s (%s라인, 페이지당 %s라인)",TimeString,total_lines_this_cluster,LinesPerPage);
    SetInnerHtmlValue("LastRefreshTime",Value);
  }
  else {
    var Value = sprintf("마지막갱신: %s (%s라인, 페이지당 %s라인)",TimeString,total_lines_this_cluster,LinesPerPage);
    SetInnerHtmlValue("LastRefreshTime",Value);
  }
}

//-----------

function SetUpPages(TotalLinesForThisCluster, CurrentPage, Lines_per_Page)
{
  TotalLinesForThisCluster = parseInt(TotalLinesForThisCluster);
  var PageCount = Math.ceil(TotalLinesForThisCluster / Lines_per_Page)

  var HtmlInsideDiv = "";
  var FlippedText = "오름차순";
  if (FlippedOrder != 0) FlippedText = "내림차순";
  HtmlInsideDiv = "<div style='cursor:pointer;width:80px;text-align:center;font-weight:bold;' class='VariableWx' onClick='FlipOrder()'>"+FlippedText+"</div>";

  if (PageCount > 0){
    HtmlInsideDiv = HtmlInsideDiv + "<div style='width:50px;text-align:center' class='VariableWx'>페이지: </div>";
  }

  var PageButtonArray = [];
  for(var PageIndex=0; PageIndex < PageCount; PageIndex++){
    PageButtonArray.push((PageIndex+1).toString(10));
  }

  PageButtonArray = ReducePages(PageButtonArray,CurrentPage);

  var AllowDisplayDots = 1;
  for(var PageIndex=0; PageIndex < PageCount; PageIndex++){
    var CurrentItem = PageButtonArray[PageIndex];
    if (CurrentItem.length > 0){
      if (PageIndex == CurrentPage){
        HtmlInsideDiv = HtmlInsideDiv + "<div style='cursor: pointer;width:38px;text-align:center;font-weight:bold;text-decoration:underline;' class='VariableWx' onClick='UpdateSelectedPage("+PageIndex+")'>"+CurrentItem+"</div>";
      }
      else {
        HtmlInsideDiv = HtmlInsideDiv + "<div style='cursor: pointer;width:38px;text-align:center;font-weight:bold;' class='VariableWx' onClick='UpdateSelectedPage("+PageIndex+")'>"+CurrentItem+"</div>";
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
}

//-----------

function FlipOrder()
{
  FlippedOrder ^= 1;
  SetGlobalVar('sorting',FlippedOrder);
  PeriodicTimerUpdateStatusData();
}

//-----------

function UpdateSelectedPage(NewSelectedPage)
{
  var PageChanged = (SelectedPage != NewSelectedPage);
  SelectedPage = NewSelectedPage;
  if (PageChanged == true) PeriodicTimerUpdateStatusData();
}

//-----------

function JumpSelectedPage(amount)
{
  SelectedPage += amount;

  if (SelectedPage < 0) SelectedPage = 0;
  if (SelectedPage > LogLinesPerCluster[SelectedCluster]) SelectedPage = LogLinesPerCluster[SelectedCluster];

  PeriodicTimerUpdateStatusData();
}

//-----------

function FillLogTable(total_lines,current_page,text_messages, max_lines, sorted_mode)
{
  var TableObj = document.getElementById("LogList");
  if (TableObj == null) return;

  var MsgArray = [];
  MsgArray = text_messages.split("\x1E");
  if (MsgArray.length > 0){
    for (var i=0; i<MsgArray.length; i++) {
      if (MsgArray[i].length == 0) {
        MsgArray.splice(i, 1);
        i--;
      }
    }
  }

  total_lines = parseInt(total_lines);
  if (total_lines < MsgArray.length) return;

  var ContentRowCount = MsgArray.length;
  if (ContentRowCount > max_lines) ContentRowCount = max_lines;
  if (ContentRowCount < 1) ContentRowCount = 1;
  var TableRowCount = (ContentRowCount + 1); // header row always there

  while (TableObj.rows.length < TableRowCount){
  	// too little rows for content: add rows to end of table
  	AddRow(TableObj,1, new Array("Center","Center","Left") );
  }

  while (TableObj.rows.length > TableRowCount){
  	// too much rows for content: remove rows from end of table
  	RemoveRow(TableObj,1);
  }

  if (MsgArray.length > 0){
	  for(var i=0; i<ContentRowCount; i++){
	    var CurrentItem = MsgArray[i];
	    if (sorted_mode != 0) CurrentItem = MsgArray[(MsgArray.length-1) - i];
		  FillLogRow(i,CurrentItem);

		  var AbsOffset = (current_page*LinesPerPage);
		  if (sorted_mode != 0) AbsOffset = (total_lines - AbsOffset);
		  FillLogRowNumber(i,AbsOffset,sorted_mode);
	  }
	}
	else {
    FillLogRow(0,"-;(No messages in log)");
	}
}

//-----------

function FillLogRowNumber(rel_offset,abs_offset, flipped_order)
{
	var CellId = "row" + (rel_offset+1) + "_0";

  var ContentValue = (abs_offset + rel_offset) + 1;
	if (flipped_order != 0) ContentValue = (abs_offset - rel_offset);

	SetInnerHtmlValue(CellId,ContentValue);
}

//-----------

function FillLogRow(RowNr, TextLine)
{
  var CellData = [];
  CellData = TextLine.split(";");
  var TimeStamp = CellData.shift();
  var Message = CellData.join(";");

  FillLogCell(RowNr, 0, TimeStamp);
  FillLogCell(RowNr, 1,Message);
}

//-----------

function FillLogCell(RowNr, CellNr, Context)
{
  var Append = 0;

  if (CellNr > 1){
    CellNr = 1;
    Append = 1;
  }

	var CellId = "row" + (RowNr+1) + "_" + (CellNr+1);

  if (Append == 1){
    Context = GetInnerHtmlValue(CellId) + "<br>" + Context;
  }

  SetInnerHtmlValue(CellId,Context);
}

//-----------

function ClearLogClick()
{
  if (confirm(sprintf("네트워크 %s의 기록을 지우시겠습니까?",SelectedCluster+1 ) ) != 0){
    var ActionParams = "action=ClearLog:"+SelectedCluster;
    xmlhttpClearLog = loadXMLDocASynch("data_srv.cgi", ActionParams, onStateChangeClearLog, onTimeoutClearLog);
    SelectedPage = 0;
  }
}

//-----------

function onTimeoutClearLog()
{
  xmlhttpClearLog.onreadystatechange = function() {}
  xmlhttpClearLog.abort();
}

//-----------

function onStateChangeClearLog()
{
  if (xmlhttpClearLog != null){
    if (xmlhttpClearLog.readyState == 4){
      if (xmlhttpClearLog.status == 200){

        var Response = decodeURIComponent(xmlhttpClearLog.responseText);
        var ResultText = [];
        ResultText = Response.split("\x1F");
        if (ResultText.length == 2){
          if (ResultText[0] != 200){
            alert(ResultText[1]);
          }
        }

        onTimeoutClearLog();
      }
    }
  }
}

//-----------

function GenerateNetworkWarning()
{
  if (NetworkLicense <= 0){
    return "네트워크 라이센스가 없습니다.";
  }
  return sprintf("네트워크 %s용 라이센스만 갖고 있습니다.",GenerateEnumeration(1,NetworkLicense) );
}

//-----------

function ClusterTabClick(ClusterNo, SkipTimerUpdate)
{
  var Warnings = [];

  if (NetworkLicense < (ClusterNo+1)){
    Warnings = AddWarning(Warnings,GenerateNetworkWarning());
  }

  DisplayWarnings(Warnings);

  //-----------------

  SelectedCluster = ClusterNo;
  SetGlobalVar('network',SelectedCluster);

  UpdateTabClasses(MaxClusterCount,SelectedCluster, null);
  SelectedPage = 0;
  if (SkipTimerUpdate != 1) PeriodicTimerUpdateStatusData();
}

//-----------

function DownloadLogClick()
{
  var LogUrlsArray = [];
  LogUrlsArray.push('00420B_Nw1.csv');
  LogUrlsArray.push('00420B_Nw2.csv');
  LogUrlsArray.push('00420B_Nw3.csv');
  LogUrlsArray.push('00420B_Nw4.csv');

  var Result = loadXMLDocSynch("data_srv.cgi", "data=logsession");
  if (Result == 0){
    alert("기록 다운로드는 이미 진행 중입니다. 나중에 다시 시도해 주세요.");
    return;
  }
  var LogUrl = LogUrlsArray[SelectedCluster] + '?session=' + Result;
  window.open(LogUrl);

}

//-----------

