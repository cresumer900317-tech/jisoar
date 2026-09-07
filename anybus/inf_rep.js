
window.onclick = function(event) 
{
	CheckMaintenanceEnableModalOnclick(event);
	CheckMaintenanceDisableModalOnclick(event);
} 

var TimerHandleData = null;

var xmlhttpStatusData = null;
var StatusDataTimeout = 0;

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

        var ModuleInfo  = [];

        SectionVars = Response.split("\x1d");
        if (SectionVars.length >= 1){
          ModuleInfo  = SectionVars[0].split("\x1E");
        }

        var RepeaterInfo = ModuleInfo.splice(0,1);
        WriteRepeaterInfo(RepeaterInfo[0].split("\x1F"));
        WriteChannelInfo(ModuleInfo);
        /// write other stuff

        onTimeoutData();
      }
    }
  }
}

//-----------

function WriteRepeaterInfo(InfoArray)
{
  var SlotNumber   = "";
  var NumberOfCh   = "0";
  var VendorName   = "";
  var ModuleName   = "";
  var SerialNr     = "";
  var HardwareRev  = "";
  var ModuleStatus = "모듈 없음";

  if (InfoArray.length >= 9){
    VendorName   = InfoArray[2];
    ModuleName   = InfoArray[4];
    SerialNr     = InfoArray[7];
    HardwareRev  = InfoArray[5];
    
    var ModErrorCode = parseInt(InfoArray[8],16);
    ModuleStatus  = SubModErrorInText(ModErrorCode);
    if (ModErrorCode == 0) ModuleStatus = "OK";
    
    SlotNumber   = InfoArray[9];
    NumberOfCh   = InfoArray[11];

    if (InfoArray[10].length > 0){
      SlotNumber = SlotNumber + " - " + InfoArray[10];
    }
  }
  
  if (InfoArray.length == 1){
    ModuleStatus = GetTextForModuleStatus(InfoArray[0]);
  }
  
  SetInnerHtmlValue("vendor",VendorName);
  SetInnerHtmlValue("modtype",ModuleName);
  SetInnerHtmlValue("serialnr",SerialNr);
  SetInnerHtmlValue("hardversion",HardwareRev);
  SetInnerHtmlValue("slot",SlotNumber);
  SetInnerHtmlValue("errors",ModuleStatus);
  SetInnerHtmlValue("channelcount",NumberOfCh);
}

//-----------

function WriteChannelInfo(InfoArray)
{
  for(var i=0; i<InfoArray.length; i++){
    if (WriteChannelInfoForChannel(InfoArray[i].split("\x1F")) == false){
      DynamicRemoveTable(i);
    }
  }
  for(var i=InfoArray.length; i<10; i++){
    // remove old channels
    DynamicRemoveTable(i);
  }
}

//-----------

function WriteChannelInfoForChannel(InfoArray)
{
  if (InfoArray.length < 7) return false;
  if ((parseInt(InfoArray[5]) & 0x80) == 0) return false;

  var ChannelNum   = parseInt(InfoArray[0]);
  var ClusterNum   = parseInt(InfoArray[1]);
  var ClusterName  = InfoArray[2];
  var StationCount = parseInt(InfoArray[3]);
  var Baudrate     = parseInt(InfoArray[4]);
  var Redundancy   = parseInt(InfoArray[5]) & 0x10;
  var RedundancyOk = parseInt(InfoArray[5]) & 0x40;
  var Setting      = parseInt(InfoArray[5]) & 0x20;
  var Termination  = parseInt(InfoArray[6]);
  
  var TableObj = document.getElementById("TableCh"+ChannelNum);
  if (TableObj == null){
    DynamicCreateTable(ChannelNum);
    TableObj = document.getElementById("TableCh"+ChannelNum);
    if (TableObj == null) return false;
  }
  
  if ((ClusterNum & 0x07) == 0x07){
    SetInnerHtmlValue("Network"+ChannelNum,"연결되지 않음");
    SetInnerHtmlValue("Baudrate"+ChannelNum,"해당되지 않음");
  }
  else {
    SetInnerHtmlValue("Network"+ChannelNum,(ClusterNum+1) + " (" + ClusterName + ")");
    SetInnerHtmlValue("Baudrate"+ChannelNum,GetBaudrateText(Baudrate));
  }
  SetInnerHtmlValue("ChannelNum"+ChannelNum,"채널 "+(ChannelNum+1));
  SetInnerHtmlValue("StationCount"+ChannelNum,StationCount);

  var RedundancyValue = GetOnOffText(Redundancy);
  if (Redundancy) RedundancyValue = RedundancyValue+" "+GetColorBallHtml(RedundancyOk);
  SetInnerHtmlValue("Redundancy"+ChannelNum,RedundancyValue);

  SetInnerHtmlValue("Setting"+ChannelNum,GetSwDswText(Setting));
  SetInnerHtmlValue("Terminator"+ChannelNum,GetOnOffText(Termination));
  
  return true;
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
  
  var CardSlot = GetGlobalInt("CardIndex",-1);
  
  if (CardSlot >= 0){
    var DataParams     = "data=repeater-info:"+CardSlot;
    xmlhttpStatusData = loadXMLDocASynch("data_srv.cgi", DataParams, onStateChangeData, onTimeoutData);
    StatusDataTimeout = 10;
  }
}

//-----------

function InitializeJavascript()
{
  // start the timer(s)
  PeriodicTimerUpdateStatusData();

  var AutoRefreshInterval = 1 * 1000;
  if (AutoRefreshInterval < 1000) AutoRefreshInterval = 1000;
  TimerHandleData = setInterval('PeriodicTimerUpdateStatusData()',AutoRefreshInterval);
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

function DynamicCreateTable(ImageIdx)
{
  var ContentDiv = document.getElementById("ChannelArea");
  if (ContentDiv == null) return null;
  
  var CurrentTable = document.createElement("table");
  CurrentTable.className = "ConfigTable";
  CurrentTable.id = "TableCh"+ImageIdx;
  CurrentTable.cellSpacing = "0";
  var RightIds = new Array("Network"+ImageIdx,"Baudrate"+ImageIdx,"StationCount"+ImageIdx,"Redundancy"+ImageIdx,"Setting"+ImageIdx,"Terminator"+ImageIdx);
  var LeftIds  = new Array("네트워크:","전송속도:","채널에서 스테이션 카운트 활성화:","이중화:","설정(Setting by):","종단 장치:");

  // header
  var RowObj = CurrentTable.insertRow(-1);
  
  var CurrentCell1 = document.createElement("TH");
  CurrentCell1.className = "TableCell header-cell header-left";
  CurrentCell1.id = "ChannelNum"+ImageIdx;
  RowObj.appendChild(CurrentCell1);

  var CurrentCell2 = document.createElement("TH");
  CurrentCell2.className = "TableCell header-cell header-left header-last";
  CurrentCell2.innerHTML = "";
  CurrentCell2.style.width = "400px";
  RowObj.appendChild(CurrentCell2);

  // create rows
  for(var rowidx=0; rowidx<RightIds.length; rowidx++){
    CurrentRow = CurrentTable.insertRow(-1);
    AddCellsToRow(CurrentRow,rowidx,LeftIds[rowidx],RightIds[rowidx]);
  }

  ContentDiv.appendChild(CurrentTable);

  return CurrentTable.id;
}

//-----------

function DynamicRemoveTable(ImageIdx)
{
  var Table = document.getElementById("TableCh"+ImageIdx);
  if (Table != null){
    var ContentDiv = document.getElementById("ChannelArea");
    if (ContentDiv != null){
      ContentDiv.removeChild(Table);
    }
  }
}

//-----------