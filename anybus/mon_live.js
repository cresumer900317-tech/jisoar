window.onclick = function(event) 
{
  if (event.target == document.getElementById("ResetLivelistModalBox")) {
    HideResetLivelistModal();
    return;
  }
	CheckMaintenanceEnableModalOnclick(event);
	CheckMaintenanceDisableModalOnclick(event);
} 

var MaxClusterCount = 4;
var MaxStationCount = 127;

var TimerHandleData = null;
var TimerHandleIdent = null;

var xmlhttpLivelistData = null;
var LivelistDataTimeout = 0; // timeout to wait for, before a new transaction is sent

var xmlhttpLivelistIdent = null;
var LivelistIdentTimeout = 0;

var SelectedCluster = 0;
var ResetRequest = 0;

var IdentNoChanged = [];
var IdentNoList = [];
var IdentNoData = [];

var BaudRate = new Array(MaxClusterCount);

var ProfitraceLicense = 0;

//-----------

var TagNameArray = [[],[],[],[]];

function EnumerateDebugVars()
{
  var Result = [];

  Result.push("MaxClusterCount="+MaxClusterCount);
  Result.push("MaxStationCount="+MaxStationCount);

  Result.push("TimerHandleData="+TimerHandleData);
  Result.push("TimerHandleIdent="+TimerHandleIdent);

  Result.push("xmlhttpLivelistData="+xmlhttpLivelistData);
  Result.push("LivelistDataTimeout="+LivelistDataTimeout);

  Result.push("xmlhttpLivelistIdent="+xmlhttpLivelistIdent);
  Result.push("LivelistIdentTimeout="+LivelistIdentTimeout);

  Result.push("SelectedCluster="+SelectedCluster);
  Result.push("ResetRequest="+ResetRequest);

  for(var c=0; c<4; c++){
    for(var s=0; s<126; s++){
      if (IdentNoChanged[c][s] != 0){
        Result.push("IdentNoChanged("+c+")=" + s);
      }
    }
  }

  for(var c=0; c<4; c++){
    for(var s=0; s<126; s++){
      if (IdentNoList[c][s] != 0){
        Result.push("IdentNoList("+c+")="+s+"->"+IdentNoList[c][s]+ " ("+ IdentNoList[c][s].toString(16) +")");
      }
    }
  }

  for(var c=0; c<4; c++){
    for(var s=0; s<126; s++){
      if (IdentNoData[c][s][0].length > 0){
        Result.push("IdentNoData("+c+")="+s+"->"+IdentNoData[c][s]);
      }
    }
  }

  Result.push("BaudRate="+BaudRate);
  Result.push("ProfitraceLicense="+ProfitraceLicense);

  return Result.join("<br>");
}

//-----------

function onTimeoutData()
{
  LivelistDataTimeout = 0;
  xmlhttpLivelistData.onreadystatechange = function() {}
  xmlhttpLivelistData.abort();
}

//-----------

function onStateChangeData()
{
  if (xmlhttpLivelistData != null){
    if (xmlhttpLivelistData.readyState == 4){
      if (xmlhttpLivelistData.status == 200){

        var Response = decodeURIComponent(xmlhttpLivelistData.responseText);

        var SectionVars = [];

        var StationCount = 0;
        var ClusterNr    = 0;
        var Resetted     = 0;
        var StationList  = [];
        var IdentList    = [];

        SectionVars = Response.split("\x1D");
        if (SectionVars.length >= 6){
          Resetted     = SectionVars[0].split("\x1F");
          ClusterNr    = SectionVars[1];
          StationCount = SectionVars[2];
          BaudRate     = SectionVars[3].split("\x1F");
          StationList  = SectionVars[4].split("\x1F");
          IdentList    = SectionVars[5].split("\x1F");
        }
        if (StationCount > MaxStationCount) StationCount = MaxStationCount;

        UpdateIdentNo(IdentList,StationCount,ClusterNr);
        UpdateLiveList(StationList,StationCount,ClusterNr);

        if (Resetted.length == 2){
          if (Resetted[0] == 200){
            var ColCount = GetSelectBoxOptionCount('livelist_disp',1);

            for(var stn=0; stn<127; stn++){
              IdentNoList[SelectedCluster][stn] = 0;
              IdentNoChanged[SelectedCluster][stn] = 0;
              for(var col=0; col< ColCount; col++){
                IdentNoData[SelectedCluster][stn][col] = "";
              }
            }
          }
          else {
            alert(Resetted[1]);
          }
        }

        SetInnerHtmlValue("baudrate","전송속도: <strong>" + GetBaudrateText(BaudRate[ClusterNr]) + "</strong>");
        UpdateTabClasses(MaxClusterCount,SelectedCluster,BaudRate);

        onTimeoutData();
      }
    }
  }
}

//-----------

function UpdateLiveList(StationList,StationCount,CurrentCluster)
{
  for(var Address=0; Address<StationCount; Address++){
    var CurrentStation = parseInt(StationList[Address],16);
    SetInnerHtmlValue("cell"+Address, GetTextToDisplayInLiveList(Address,CurrentStation,CurrentCluster) );
    SetClass("cell"+Address,GetLivelistClasses(CurrentStation,"LiveListDataCell"));
  }
}

//-----------

function GetTextToDisplayInLiveList(Address,CurrentStation,CurrentCluster)
{
  var TextToDisplay = Address;

  var DisplayIndex = GetSelectBoxValue('livelist_disp',-1);
  if (DisplayIndex >= 0){

    if ((DisplayIndex  < 100) && (CurrentStation & 0x00000001)){ // gsd info field & must be slave
      if (IdentNoList[CurrentCluster][Address] != 0){
        TextToDisplay = FormatIdentNo(IdentNoList[CurrentCluster][Address]);

        var CurrentArray = IdentNoData[CurrentCluster][Address];
        if (CurrentArray.length > DisplayIndex){
          if (CurrentArray[DisplayIndex] != ""){
            TextToDisplay = CurrentArray[DisplayIndex];
          }
        }
      }
    }

    if ((DisplayIndex == 100) && (CurrentStation & 0x00000001)){ // ident no from data & must be slave
      if (IdentNoList[CurrentCluster][Address] != 0){
        TextToDisplay = FormatIdentNo(IdentNoList[CurrentCluster][Address]);
      }
    }

    if (DisplayIndex == 101){ // channel no from data & for masters and slaves
      var ChannelNo = (CurrentStation >> 10) & 0x1F;
      
      if ((ChannelNo > 0) && (ChannelNo <= 20)){
        ChannelNo--; // 0..19
        var ModuleNumber  = Math.floor(ChannelNo / 2) + 1;
        var ModuleChannel = (ChannelNo % 2) + 1;
        TextToDisplay = sprintf("모듈%s,채널%s",ModuleNumber,ModuleChannel);
      }
      if (ChannelNo > 20){
        TextToDisplay = "기본의 (Internal)";
      }
    }
    
    if (DisplayIndex == 102){ // livelist tag name
      var TagName = TagNameArray[CurrentCluster][Address];
      
      if (TagName != undefined){
        if (TagName.length > 0){
          TextToDisplay = TagName;
        }
      }
    }
  }

  return TextToDisplay;
}

//-----------

function FormatIdentNo(identNrAsInt)
{
  var Str = identNrAsInt.toString(16).toUpperCase();
  while(Str.length < 4){
    Str = "0" + Str;
  }
  return Str;
}

//-----------

function UpdateIdentNo(NewIdentNoList,StationCount,CurrentCluster)
{
  for(var i=0; i<StationCount; i++){
    var CurrentNewIdentNr = parseInt(NewIdentNoList[i],16);
    if ((IdentNoList[CurrentCluster][i] != CurrentNewIdentNr) && (CurrentNewIdentNr != 0) && (isNaN(CurrentNewIdentNr) == false)){
      IdentNoList[CurrentCluster][i] = CurrentNewIdentNr;
      IdentNoChanged[CurrentCluster][i] = 1;
    }
  }
}

//-----------

function PeriodicTimerGetIdentNoData() // 100ms timer
{
  if (LivelistIdentTimeout > 0){
    LivelistIdentTimeout--;
    return;
  }

  if (xmlhttpLivelistIdent != null){
    xmlhttpLivelistIdent.abort();
  }

  if (PeriodicTimerGetIdentNoData.CurrentIndex == undefined ) {
    PeriodicTimerGetIdentNoData.CurrentIndex = 0;
  }

  for(var i=0; i<MaxStationCount; i++){
    var Index = (PeriodicTimerGetIdentNoData.CurrentIndex + i) % MaxStationCount;
    if ((IdentNoChanged[SelectedCluster][Index] != 0) && (IdentNoList[SelectedCluster][Index] != 0)){

      IdentNoChanged[SelectedCluster][Index] = 0;

      var DataParams   = "data=GsdInfo:0x"+ IdentNoList[SelectedCluster][Index].toString(16); // hex
      var ReturnParams = "return=" + SelectedCluster + "+" + Index;
      var TotalParams  = DataParams + "&" + ReturnParams;

      xmlhttpLivelistIdent = loadXMLDocASynch("data_srv.cgi", TotalParams, onStateChangeIdent, onTimeoutIdent);
      LivelistIdentTimeout = 100; // 10 sec timeout

      PeriodicTimerGetIdentNoData.CurrentIndex = Index;
      break;
    }
  }

  PeriodicTimerGetIdentNoData.CurrentIndex++;
  PeriodicTimerGetIdentNoData.CurrentIndex = (PeriodicTimerGetIdentNoData.CurrentIndex % MaxStationCount);

}

//-----------

function onTimeoutIdent()
{
  LivelistIdentTimeout = 0;
  xmlhttpLivelistIdent.onreadystatechange = function() {}
  xmlhttpLivelistIdent.abort();
}

//-----------

function onStateChangeIdent()
{
  if (xmlhttpLivelistIdent != null){
    if (xmlhttpLivelistIdent.readyState == 4){
      if (xmlhttpLivelistIdent.status == 200){

        var Response = decodeURIComponent(xmlhttpLivelistIdent.responseText);

        if (Response.length > 0){

          var SectionList = [];

          var GsdDataList = [];
          var CurrentCluster = -1;
          var CurrentAddress = -1;

          SectionList = Response.split("\x1d"); // split by char
          if (SectionList.length >= 2){
          	GsdDataList = SectionList[0].split("\x1F");
          	CurrentCluster = SectionList[1];
          	CurrentAddress = SectionList[2];
          }

          if ((CurrentCluster != -1) && (CurrentAddress != -1)){
            for(var i=0; i<GsdDataList.length; i++){
              IdentNoData[CurrentCluster][CurrentAddress][i] = GsdDataList[i];
            }
          }

        }

        onTimeoutIdent();
      }
    }
  }
}

//-----------

function LivelistSelectBoxChange()
{
  SetGlobalVar('livelist',GetSelectBoxIndex('livelist_disp',0));

  PeriodicTimerUpdateLivelistData();
}

//-----------

function LivelistCellClick(Address)
{
  // no action required so far...
}

//-----------

function ShowResetLivelistModal()
{
	SetCheckBoxValue("CheckboxIncludeIdentNrs",true);
	SetVisibility("ResetLivelistModalBox",true);
}

//-----------

function HideResetLivelistModal()
{
	SetVisibility("ResetLivelistModalBox",false);
}

//-----------

function ResetLiveList(ResetIdentNrs)
{
  ResetRequest = 1;
	if (ResetIdentNrs === true) ResetRequest = 2;
  PeriodicTimerUpdateLivelistData();
  HideResetLivelistModal();
}

//-----------

function PeriodicTimerUpdateLivelistData() // 1 sec timer
{
  if (LivelistDataTimeout > 0){
    LivelistDataTimeout--;
    return;
  }

  var ActionParams = "return=0";
  if (ResetRequest != 0){
  	ActionParams = "action=ResetLivelist:"+SelectedCluster+":"+ResetRequest;
  }
  var ReturnParams   = "return="+SelectedCluster;
  var DataParams     = "data=StationCount+Baudrate+Livelist:"+SelectedCluster+"+IdentNrs:"+SelectedCluster;
  var TotalParams    = ActionParams + "&" + ReturnParams + "&" + DataParams;

  xmlhttpLivelistData = loadXMLDocASynch("data_srv.cgi",TotalParams, onStateChangeData, onTimeoutData);

  ResetRequest = 0;
  LivelistDataTimeout = 10;
}


//-----------

function InitializeJavascript()
{
  var Cluster1Tags = "";
  var Cluster2Tags = "";
  var Cluster3Tags = "";
  var Cluster4Tags = "";
  
  TagNameArray[0] = Cluster1Tags.split("\x1F");
  TagNameArray[1] = Cluster2Tags.split("\x1F");
  TagNameArray[2] = Cluster3Tags.split("\x1F");
  TagNameArray[3] = Cluster4Tags.split("\x1F");
  
  //-------------------------------------
  
  ProfitraceLicense = Math.min(4,4);

  //-------------------------------------

  var ColCount = GetSelectBoxOptionCount('livelist_disp',1);

  IdentNoChanged = new Array(MaxClusterCount);
  IdentNoList = new Array(MaxClusterCount);
  IdentNoData = new Array(MaxClusterCount);

  for(var clus=0; clus<MaxClusterCount; clus++){

    IdentNoChanged[clus] = new Array(MaxStationCount);
    IdentNoList[clus] = new Array(MaxStationCount);
    IdentNoData[clus] = new Array(MaxStationCount);

    for(var stn=0; stn<127; stn++){

      IdentNoList[clus][stn] = 0;
      IdentNoChanged[clus][stn] = 0;
      IdentNoData[clus][stn] = new Array(ColCount);

      for(var y=0; y< ColCount; y++){
        IdentNoData[clus][stn][y] = "";
      }
    }
  }

  ResetRequest = 0;

  for(var i=0; i<MaxClusterCount; i++){
    BaudRate[i]  = 0;
  }

  // restore global vars
  var SelectedClusterIndex = GetGlobalInt('network',0);
  ClusterTabClick( SelectedClusterIndex , 1);

  var SelectedLivelistIndex = GetGlobalInt('livelist',0);
  SetSelectBoxIndex('livelist_disp', SelectedLivelistIndex);

  // start the timer(s)
  LivelistDataTimeout = 0;
  LivelistIdentTimeout = 0;

  ClusterTabClick(0,0);

  var AutoRefreshInterval = 1 * 1000;
  if (AutoRefreshInterval < 1000) AutoRefreshInterval = 1000;
  TimerHandleData = setInterval('PeriodicTimerUpdateLivelistData()',AutoRefreshInterval);
  TimerHandleIdent= setInterval('PeriodicTimerGetIdentNoData()',AutoRefreshInterval/10);
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
  if (SkipTimerUpdate != 1) PeriodicTimerUpdateLivelistData();
}

//-----------
