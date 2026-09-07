
window.onclick = function(event) 
{
	CheckMaintenanceEnableModalOnclick(event);
	CheckMaintenanceDisableModalOnclick(event);
} 

var MaxClusterCount = 4;

var xmlhttpStatisticData = null;
var StatisticDataTimeout = 0;

var xmlhttpStatisticAction = null;

var SelectedCluster = 0;

var BaudRate = new Array(MaxClusterCount);

var ProfitraceLicense = 0;

//-----------

function EnumerateDebugVars()
{
  var Result = [];

  Result.push("MaxClusterCount="+MaxClusterCount);
  Result.push("xmlhttpStatisticData="+xmlhttpStatisticData);
  Result.push("StatisticDataTimeout="+StatisticDataTimeout);

  Result.push("xmlhttpStatisticAction="+xmlhttpStatisticAction);

  Result.push("SelectedCluster="+SelectedCluster);
  Result.push("BaudRate="+BaudRate);

  Result.push("ProfitraceLicense="+ProfitraceLicense);

  return Result.join("<br>");
}

//-----------

function onTimeout()
{
  StatisticDataTimeout = 0;
  xmlhttpStatisticData.onreadystatechange = function() {}
  xmlhttpStatisticData.abort();
}

//-----------

function onStateChange()
{
  if (xmlhttpStatisticData != null){
    if (xmlhttpStatisticData.readyState == 4){
      if (xmlhttpStatisticData.status == 200){

        var Response = decodeURIComponent(xmlhttpStatisticData.responseText);

        var SectionVars = [];

        var DiagType     = -1;
        var StationCount = 0;
        var ClusterNr    = 0;
        var StatisticsList    = [];
        var StatisticsChanged = [];
        var Livelist          = [];

        SectionVars = Response.split("\x1d");

        if (SectionVars.length >= 7){
          DiagType       = SectionVars[0];
          ClusterNr      = SectionVars[1];
          StationCount   = SectionVars[2];
          BaudRate       = SectionVars[3].split("\x1F");
          StatisticsList = SectionVars[4].split("\x1F");
          StatisticsChanged = SectionVars[5].split("\x1F");
          Livelist       = SectionVars[6].split("\x1F");
        }

        if (onStateChange.PreviousDiagType == undefined ) {
          onStateChange.PreviousDiagType = -1;
        }

        if (DiagType != onStateChange.PreviousDiagType){
          onStateChange.PreviousDiagType = DiagType;
          ClearTable();
        }

        UpdateStatistic(StatisticsList,StatisticsChanged,StationCount);
        UpdateLivelist(Livelist,StationCount);

        SetInnerHtmlValue("baudrate","전송속도: <strong>" + GetBaudrateText(BaudRate[ClusterNr]) + "</strong>");
        UpdateTabClasses(MaxClusterCount,SelectedCluster,BaudRate);

        onTimeout();
      }
    }
  }
}

//-----------

function UpdateStatistic(StationList,StationChanged,StationCount)
{
  if (StationCount > 129) StationCount = 129;
  for(var Address=0; Address<StationCount; Address++){

    var CellName = "stat"+Address;

    var CellText = "";
    var CellChanged = 0;
    var CellClasses = "StatisticDataCell";

    if (StationList[Address] > 0){
      CellText = GetStatisticsValueText(StationList[Address]);
      CellChanged = parseInt(StationChanged[Address],10);
      if (Address >= 127) CellText = AddToolTip(CellText,"<div class='ErrorText'>이러한 통계아이템들은 특정주소에 연관되지 않습니다.</div>","statisticsStyle");
    }

    if ((GetProperty(CellName,"CellChanged") != CellChanged) && (CellChanged != 0)){
      SetProperty(CellName,"CellChanged",CellChanged);
      CellClasses = CellClasses + " StatisticDataCell-StatisticChange";
    }

    SetInnerHtmlValue(CellName,CellText);
    SetClass(CellName,CellClasses);
  }
}

//-----------

function UpdateLivelist(StationList,StationCount)
{
  for(var Address=0; Address<StationCount; Address++){
    var CurrentStation = parseInt(StationList[Address],16);
    SetClass("live"+Address,GetLivelistClasses(CurrentStation,"StatisticLiveCell"));
  }
}

//-----------

function ClearTable()
{
  for(var Address=0; Address<130; Address++){
    var CellName = "stat"+Address;
    var LiveName = "live"+Address;
    SetInnerHtmlValue(CellName,"");
    SetClass(CellName,"StatisticDataCell");
    SetClass(LiveName,"StatisticLiveCell");    
  }
}

//-----------

// periodic refresh function
function PeriodicTimer()
{
  if (StatisticDataTimeout > 0){
    StatisticDataTimeout--;
    return;
  }

  if (xmlhttpStatisticData != null){
    xmlhttpStatisticData.abort();
  }

  var DiagType = GetSelectBoxValue('diag_list',0);

  var ReturnParams   = "return="+DiagType+"+"+SelectedCluster;
  var DataParams     = "data=StationCount+Baudrate+Statistics:"+DiagType+":"+SelectedCluster+"+StatisticsChanged:"+DiagType+":"+SelectedCluster+"+Livelist:"+SelectedCluster;
  var TotalParams    = ReturnParams + "&" + DataParams;

  xmlhttpStatisticData = loadXMLDocASynch("data_srv.cgi",TotalParams, onStateChange, onTimeout);

  StatisticDataTimeout = 10;
}

//-----------

function StatisticSelectBoxChange()
{
  SetGlobalVar('statistic',GetSelectBoxIndex('diag_list',0));
  UpdateStatisticDescription();
  PeriodicTimer();
}

//-----------

function ResetCurrentStatistic()
{
  var ActionParams = "action=ResetStatistic:"+SelectedCluster+":"+GetSelectBoxValue('diag_list',0);
  xmlhttpStatisticAction = loadXMLDocASynch("data_srv.cgi",ActionParams, onStateChangeResetStatistic, onTimeoutResetStatistic);
}

//-----------

function ResetAllStatistics()
{
  var ActionParams = "action=ResetAllStatistic:"+SelectedCluster;
  xmlhttpStatisticAction = loadXMLDocASynch("data_srv.cgi",ActionParams, onStateChangeResetStatistic, onTimeoutResetStatistic);
}

//-----------

function onTimeoutResetStatistic()
{
  xmlhttpStatisticAction.onreadystatechange = function() {}
  xmlhttpStatisticAction.abort();
}

//-----------

function onStateChangeResetStatistic()
{
  if (xmlhttpStatisticAction != null){
    if (xmlhttpStatisticAction.readyState == 4){
      if (xmlhttpStatisticAction.status == 200){

        var Response = decodeURIComponent(xmlhttpStatisticAction.responseText);
        var ResultText = [];
        ResultText = Response.split("\x1F");
        if (ResultText.length == 2){
          if (ResultText[0] != 200){
            alert(ResultText[1]);
          }
        }

        onTimeoutResetStatistic();
      }
    }
  }
}


//-----------

function InitializeJavascript()
{
  ProfitraceLicense = Math.min(4,4);

  for(var i=0; i<MaxClusterCount; i++){
    BaudRate[i]  = 0;
  }

  // restore global vars
  var SelectedClusterIndex = GetGlobalInt('network',0);
  ClusterTabClick( SelectedClusterIndex ,1);

  var SelectedStatisticIndex = GetGlobalInt('statistic',0);
  SetSelectBoxIndex('diag_list',SelectedStatisticIndex);

  StatisticDataTimeout = 0;

  ClusterTabClick(0,0);

  var AutoRefreshInterval = 1 * 1000;
  if (AutoRefreshInterval < 1000) AutoRefreshInterval = 1000;
  setInterval('PeriodicTimer()',AutoRefreshInterval);

  UpdateStatisticDescription();
}

//-----------

function StatisticCellClick(Address)
{
  // no action required so far...
}

//-----------

function LivelistCellClick(Address)
{
  // no action required so far...
}

//-----------

function GenerateProfitraceWarning()
{
  if (ProfitraceLicense <= 0){
    return ("프로피트레이스 OE 라이센스가 없습니다.");
  }
  return sprintf("네트워크 %s용 프로피트레이스 OE 라이센스만 갖고 있습니다.",GenerateEnumeration(1,ProfitraceLicense) );
}

//-----------

function ClusterTabClick(ClusterNo, SkipTimerUpdate)
{
  var Warnings = [];

  if (ProfitraceLicense < (ClusterNo+1)){
    Warnings = AddWarning(Warnings,GenerateProfitraceWarning());
  }

  DisplayWarnings(Warnings);

  //-----------------
  SelectedCluster = ClusterNo;
  SetGlobalVar('network',SelectedCluster);

  UpdateTabClasses(MaxClusterCount,SelectedCluster,BaudRate);
  if (SkipTimerUpdate != 1) PeriodicTimer();
}

//-----------

function UpdateStatisticDescription()
{
  var StatDescription = GetSelectBoxTitle('diag_list',"")
  var StatText = GetSelectBoxText('diag_list',"")
  if (StatText.length == 0) StatText = "통계 선택";
  SetInnerHtmlValue('StatisticDescription',StatText + ": "+ StatDescription);
}

//-----------
