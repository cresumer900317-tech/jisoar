
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

        var GenericModuleInfo = ModuleInfo.splice(0,1)[0].split("\x1F");
        var Outputs = ModuleInfo.splice(0,parseInt(GenericModuleInfo[11]));
        var Inputs  = ModuleInfo.splice(0,parseInt(GenericModuleInfo[12]));
        
        // update channel count with amount of table added channels (ignors empty channels)
        GenericModuleInfo[11] = WriteChannelInfo(Outputs,"Output");
        //GenericModuleInfo[12] = WriteChannelInfo(Inputs ,"Input" ); --> no inputs on a relay module
        WriteModuleInfo(GenericModuleInfo);
        
        onTimeoutData();
      }
    }
  }
}

//-----------

function WriteModuleInfo(InfoArray)
{
  var SlotNumber   = "";
  var NumberOfCh   = "0";
  var VendorName   = "";
  var ModuleName   = "";
  var SerialNr     = "";
  var HardwareRev  = "";
  var ModuleStatus = "모듈 없음";
  
  if (InfoArray.length >= 8){
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


function AddCellsToRow(RowObj, RowNumber, LeftCellId, RightCellId)
{
  var RowMod = ((RowNumber+1) % 2);

  var CurrentCell1 = RowObj.insertCell(-1);
  CurrentCell1.className = "TableCell R"+RowMod+"Left";
  CurrentCell1.innerHTML = RowNumber;
  CurrentCell1.id = LeftCellId;

  var CurrentCell2 = RowObj.insertCell(-1);
  CurrentCell2.id = RightCellId;
  CurrentCell2.className = "TableCell R"+RowMod+"Left";
  CurrentCell2.innerHTML = "?";
  CurrentCell2.style.width = "400px";
}

//-----------

function DynamicCreateTable(RowCount, idname, Title)
{
  var ContentDiv = document.getElementById("channel_area");
  if (ContentDiv == null) return null;
  
  var CurrentTable = document.createElement("table");
  CurrentTable.className = "ConfigTable";
  CurrentTable.id = idname;
  CurrentTable.cellSpacing = "0";
  var RightIds = [];
  var LeftIds  = [];
  for(var i=0; i<RowCount; i++){
    RightIds.push(Title+"val"+i);
    LeftIds.push(Title+"name"+i);
  }

  // header
  var RowObj = CurrentTable.insertRow(-1);
  
  var CurrentCell1 = document.createElement("TH");
  CurrentCell1.className = "TableCell header-cell header-left";
  CurrentCell1.innerHTML = "채널";
  RowObj.appendChild(CurrentCell1);

  var CurrentCell2 = document.createElement("TH");
  CurrentCell2.className = "TableCell header-cell header-left header-last";
  CurrentCell2.innerHTML = "값";
  CurrentCell2.style.width = "400px";
  RowObj.appendChild(CurrentCell2);

  // create rows
  for(var rowidx=0; rowidx<RightIds.length; rowidx++){
    CurrentRow = CurrentTable.insertRow(-1);
    AddCellsToRow(CurrentRow,rowidx,LeftIds[rowidx],RightIds[rowidx]);
  }

  ContentDiv.appendChild(CurrentTable);

  return CurrentTable;
}

function DynamicRemoveTable(TableName)
{
  var ContentDiv = document.getElementById("channel_area");
  var Table = document.getElementById(TableName);
  if ((ContentDiv != null) && (Table != null)){
    ContentDiv.removeChild(Table);
  }
}

//-----------

function RemoveEmptyElements(ChannelArray)
{
  for(var i=0; i<ChannelArray.length; i++){
    if (ChannelArray[i].length <= 0){
      ChannelArray.splice(i,1);
      i--;
    }
  }
  
  return ChannelArray;
}

//-----------

function WriteChannelInfo(ChannelArray,ChannelType)
{
  var TableName = "Table"+ChannelType+"Channels";
  var Table = document.getElementById(TableName);
  
  ChannelArray = RemoveEmptyElements(ChannelArray);

  if (ChannelArray.length == 0){
    if (Table != null){
      DynamicRemoveTable(TableName);
    }
    return 0;
  }

  var Title = ChannelType+" channel"; 
  
  if (Table == null){
    Table = DynamicCreateTable(ChannelArray.length,TableName,Title);
  }
  
  if (Table != null){
    for(var i=0; i<ChannelArray.length; i++){
      var CurrentChannel = ChannelArray[i].split("\x1F");

      var StateText = "알수없음";
  
      switch (parseInt(CurrentChannel[1])){
        case 0: // off
          StateText = GetColorBallHtml(0)+" "+GetOnOffText(0);
          break;
        case 1: // on
          StateText = GetColorBallHtml(1)+" "+GetOnOffText(1);
          break;
      }
      
      SetInnerHtmlValue(Title+"name"+i,CurrentChannel[0]);
      SetInnerHtmlValue(Title+"val"+i,StateText);
    }
  }
  
  return ChannelArray.length;
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

    var DataParams     = "data=iocard-info:"+CardSlot;
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
