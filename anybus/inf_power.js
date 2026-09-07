
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

        var PwrInfo = ModuleInfo.splice(0,1);
        WritePwrInfo(PwrInfo[0].split("\x1F"));
        /// write other stuff

        onTimeoutData();
      }
    }
  }
}

//-----------

function WritePwrInfo(InfoArray)
{
  var SlotNumber   = "";
  var VendorName   = "";
  var ModuleName   = "";
  var SerialNr     = "";
  var HardwareRev  = "";
  var ModuleStatus = "모듈 없음";
  var ModuleVoltage = "";
  var ModuleCurrent = "";
  var LedOverload  = 0;
  var BalanceValue = 0;
  var BalanceError = 0;
  var BalanceCount = 0;

  if (InfoArray.length >= 14){
    VendorName   = InfoArray[2];
    ModuleName   = InfoArray[4];
    SerialNr     = InfoArray[7];
    HardwareRev  = InfoArray[5];
    
    var ModErrorCode = parseInt(InfoArray[8],16);
    ModuleStatus  = SubModErrorInText(ModErrorCode);
    if (ModErrorCode == 0) ModuleStatus = "OK";
    
    SlotNumber   = InfoArray[9];
    ModuleVoltage= InfoArray[11];
    ModuleCurrent= InfoArray[12];
    LedOverload  = parseInt(InfoArray[13]);
    BalanceValue = parseInt(InfoArray[14]);
    BalanceError = parseInt(InfoArray[15]);
    BalanceCount = parseInt(InfoArray[16]);

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
  SetInnerHtmlValue("voltage",ModuleVoltage);  
  SetInnerHtmlValue("current",ModuleCurrent);  
  
  var OffText = GetColorBallHtml(1)+" "+GetOnOffText(0);
  var OnText  = GetColorBallHtml(0)+" "+GetOnOffText(1);
  SetInnerHtmlValue("overload",GetConditionalText(LedOverload != 0,OnText,OffText));

  if (BalanceCount < 2){
  	SetVisibility("balanceRow",false);
    SetInnerHtmlValue("balance", "-");
  }
  else {
    SetVisibility("balanceRow",true,GetBrowserDisplayStyle("table-row"));
    var GoodText = GetColorBallHtml(1)+" "+BalanceValue+"%";
    var BadText  = GetColorBallHtml(0)+" "+BalanceValue+"%";
    SetInnerHtmlValue("balance", GetConditionalText(BalanceError,BadText,GoodText));
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
  
  var CardSlot = GetGlobalInt("CardIndex",-1);
  
  if (CardSlot >= 0){
    var DataParams     = "data=pwr-info:"+CardSlot;
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

