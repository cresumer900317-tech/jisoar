
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

        var SectionVars    = [];

        var PageAccessScopeImages = 0;
        var PageAccessScopeErrors = 0;
        var ModuleInfo     = [];

        SectionVars = Response.split("\x1d");
        if (SectionVars.length >= 3){
	        PageAccessScopeImages = parseInt(SectionVars[0]);
        	PageAccessScopeErrors = parseInt(SectionVars[1]);
          ModuleInfo  = SectionVars[2].split("\x1E");
        }

        var RepeaterInfo = ModuleInfo.splice(0,1);
        var VersionArray = WriteRepeaterInfo(RepeaterInfo[0].split("\x1F"),PageAccessScopeImages,PageAccessScopeErrors);
        WriteChannelInfo(ModuleInfo,VersionArray);
        /// write other stuff

        onTimeoutData();
      }
    }
  }
}

//-----------

function ParseSettingsControls()
{
  var value = GetSelectBoxValue("link_watchdog_type",0);
  var UserDefinedEnabled = (value == 200);
  SetVisibility("link_watchdog_userdef",UserDefinedEnabled);
  
  //--------
  
  var value = GetSelectBoxValue("link_lost_behaviour_value",0);
  var UserDefinedEnabled = (value > 0);
  SetVisibility("link_lost_behaviour_userdef1",UserDefinedEnabled);
  var UserDefinedEnabled = (value > 1);
  SetVisibility("link_lost_behaviour_userdef2",UserDefinedEnabled);
  
  //--------
  
  var value = GetSelectBoxValue("link_cycle_time_type",0);
  var UserDefinedEnabled = (value != 0);
  SetVisibility("link_cycle_time_userdef",UserDefinedEnabled);
  
}

//-----------

function WriteSettingsInfo()
{
  var CardSlot = GetGlobalInt("CardIndex",-1);
  var ModuleSettings = decodeURIComponent(loadXMLDocSynch("data_srv.cgi", "data=pacoupler-settings:"+CardSlot));

  ModuleSettings = ModuleSettings.split("\x1f");
  if (ModuleSettings.length < 10){
    SetVisibility("LinkConfigArea",false);
    return;
  }
    
  var ImplementedItems = parseInt(ModuleSettings[0]);
  if (ImplementedItems == 0){
    SetVisibility("LinkConfigArea",false);
    return;
  }

  SetVisibility("LinkConfigArea",true);
  
  //-----
  
  if (ImplementedItems & 0x0002){ // watchdog
    SetVisibility("link_watchdog",true,"table-row");
    
    var WdFactor1 = parseInt(ModuleSettings[1]);
    var WdFactor2 = parseInt(ModuleSettings[2]);
    var WdFactor  = (WdFactor1 * WdFactor2 * 10);
    
    if (WdFactor1 == 0){ // special
      SetSelectBoxValue("link_watchdog_type",WdFactor2);
      SetTextValue("link_watchdog_factor","3000");
    }
    else { // normal factors
      SetSelectBoxValue("link_watchdog_type",200);  // user defined
      SetTextValue("link_watchdog_factor",WdFactor);
    }
  }
  else {
    SetVisibility("link_watchdog",false);
  }
  
  //-----
  
  if (ImplementedItems & 0x0004){ // retries
    SetVisibility("link_retries",true,"table-row");
    var value = parseInt(ModuleSettings[3]);
    SetTextValue("link_retries_value",value);
  }
  else {
    SetVisibility("link_retries",false);
  }
  
  //-----
  
  if (ImplementedItems & 0x0008){ // ident nr adapt
    SetVisibility("link_ident_adapt",true,"table-row");
    var value = parseInt(ModuleSettings[4]);
    SetSelectBoxValue("link_ident_adapt_value",value);
  }
  else {
    SetVisibility("link_ident_adapt",false);
  }
  
  //-----
  
  if (ImplementedItems & 0x0010){ // block diag
    SetVisibility("link_diag_block",true,"table-row");
    var value = parseInt(ModuleSettings[5]);
    SetSelectBoxValue("link_diag_block_value",value);
  }
  else {
    SetVisibility("link_diag_block",false);
  }
  
  //-----
  
  if (ImplementedItems & 0x0020){ // block dpv1
    SetVisibility("link_dpv1_block",true,"table-row");
    var value = parseInt(ModuleSettings[6]);
    SetSelectBoxValue("link_dpv1_block_value",value);
  }
  else {
    SetVisibility("link_dpv1_block",false);
  }
  
  //-----
  
  if (ImplementedItems & 0x0040){ // device lost
    SetVisibility("link_lost_behaviour",true,"table-row");
    var value = parseInt(ModuleSettings[7]);
    var subst = parseInt(ModuleSettings[8]);
    SetSelectBoxValue("link_lost_behaviour_value",value & 0x0F);
    SetCheckBoxValue("link_lost_behaviour_ExtDiag",(value & 0x10) != 0);
    SetCheckBoxValue("link_lost_behaviour_ResDiag",(value & 0x20) != 0);      
    SetTextValue("link_lost_behaviour_substitute",subst.toString(16));
  }
  else {
    SetVisibility("link_lost_behaviour",false);
  }
  
  //-----
  
  if (ImplementedItems & 0x0080){ // cycle time
    SetVisibility("link_cycle_time",true,"table-row");
    var value = parseInt(ModuleSettings[9]);
    if (value == 0){
      SetSelectBoxValue("link_cycle_time_type",0);
    }
    else {
      SetSelectBoxValue("link_cycle_time_type",1);
    }
    SetTextValue("link_cycle_time_value",value);
  }
  else {
    SetVisibility("link_cycle_time",false);
  }
  
  setInterval('ParseSettingsControls()',200);
  
  FixTableRows("LinkConfig");
}

//-----------

function WriteRepeaterInfo(InfoArray,PageAccessScopeImages,PageAccessScopeErrors)
{
  var SlotNumber   = "";
  var NumberOfCh   = "";
  var VendorName   = "";
  var ModuleName   = "";
  var SerialNr     = "";
  var SoftwareRev  = "";
  var HardwareRev  = "";
  var ModuleStatus = "모듈 없음";
  var ImageLinks   = [];

  if (InfoArray.length >= 11){
    
    VendorName   = InfoArray[2];
    ModuleName   = InfoArray[4];
    HardwareRev  = InfoArray[5];
    SoftwareRev  = InfoArray[6];
    SerialNr     = InfoArray[7];
    
    var ModErrorCode = parseInt(InfoArray[8],16);
    ModuleStatus  = SubModErrorInText(ModErrorCode);
    if (ModErrorCode == 0) ModuleStatus = "OK";
    
    SlotNumber = InfoArray[9];
    NumberOfCh = InfoArray[11];
    
    switch(PageAccessScopeImages){
    	case 1:
    	  var CurrentLink = { label: "오실로스코프 이미지 페이지로 연결", link: "No access" };
    	  ImageLinks.push(CurrentLink);
    	  break;
    	case 2:
    	  var CurrentLink = { label: "오실로스코프 이미지 페이지로 연결", link: GenerateNavigateLink("mon_scope_list.htm","여기를 클릭하세요") };
    	  ImageLinks.push(CurrentLink);
	    	break;
    }
    
    switch(PageAccessScopeErrors){
    	case 1:
    	  var CurrentLink = { label: "오실로스코프 에러 이미지 페이지로 연결", link: "No access" };
    	  ImageLinks.push(CurrentLink);
    	  break;
    	case 2:
    	  if (parseInt(InfoArray[12]) != 0){
    	  	var CurrentLink = { label: "오실로스코프 에러 이미지 페이지로 연결", link: GenerateNavigateLink("mon_scope_e_list.htm","여기를 클릭하세요") };
    	  	ImageLinks.push(CurrentLink);
    	  }
    	  else {
  	  	  var CurrentLink = { label: "오실로스코프 에러 이미지 페이지로 연결", link: "지원되지 않음" };
	    	  ImageLinks.push(CurrentLink);
    	  }
	    	break;
    }
    
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
  SetInnerHtmlValue("softversion",SoftwareRev);
  SetInnerHtmlValue("hardversion",HardwareRev);
  SetInnerHtmlValue("slot",SlotNumber);
  SetInnerHtmlValue("errors",ModuleStatus);
  SetInnerHtmlValue("channelcount",NumberOfCh);  
  
  SetVisibility("row_link1",ImageLinks.length >= 1,"table-row");
  SetVisibility("row_link2",ImageLinks.length >= 2,"table-row");
  if (ImageLinks.length >= 1){
  	SetInnerHtmlValue("cell1_link1",ImageLinks[0].label);
  	SetInnerHtmlValue("cell2_link1",ImageLinks[0].link);
  }
  if (ImageLinks.length >= 2){
  	SetInnerHtmlValue("cell1_link2",ImageLinks[1].label);
  	SetInnerHtmlValue("cell2_link2",ImageLinks[1].link);
  }

  return SoftwareRev.match(/[0-9]{1,}/gi);
}

//-----------

function WriteChannelInfo(InfoArray,VersionArray)
{
  for(var i=0; i<InfoArray.length; i++){
    if (WriteChannelInfoForChannel(InfoArray[i].split("\x1F"),VersionArray) == false){
      DynamicRemoveTable(i);
    }
  }
  
  for(var i=InfoArray.length; i<10; i++){
    // remove old channels
    DynamicRemoveTable(i);
  }
  
  if ((InfoArray.length == 0) || (VersionArray.length == 0)){
    SetVisibility("LinkConfigArea",false);
  }
}

//-----------

function WriteChannelInfoForChannel(InfoArray,VersionArray)
{
  
  //("Network"+ImageIdx,"Baudrate"+ImageIdx,"StationCount"+ImageIdx,"LinkFunc"+ImageIdx,"Setting"+ImageIdx,"DcVolt"+ImageIdx,"Current"+ImageIdx);
  
  if (InfoArray.length < 16) return false;
  if ((parseInt(InfoArray[5]) & 0x80) == 0) return false;

  var ChannelNum   = parseInt(InfoArray[0]);
  var ClusterNum   = parseInt(InfoArray[1]);
  var ClusterName  = InfoArray[2];
  var StationCount = parseInt(InfoArray[3]);
  var Baudrate     = parseInt(InfoArray[4]);
  var LinkFunc     = parseInt(InfoArray[5]) & 0x08; 
  var Setting      = parseInt(InfoArray[5]) & 0x20;
  var DCVoltage    = InfoArray[6];
  var DCVplus      = InfoArray[7];
  var DCVmin       = InfoArray[8];
  var DCVnoise     = InfoArray[9];
  var DCVunbal     = InfoArray[10];
  var CurrentCons  = InfoArray[11];

  var LedSystem        = parseInt(InfoArray[12]);
  var LedSighalLowHigh = parseInt(InfoArray[13]);
  var LedPower         = parseInt(InfoArray[14]);
  var LedNetwork       = parseInt(InfoArray[15]);
  
  var LinkFuncText = GetOnOffText(LinkFunc);
  var MajorVersion = parseInt(VersionArray[0]);
  var MinorVersion = parseInt(VersionArray[1]);
  var TotalVersion = (MajorVersion * 1000) + MinorVersion;
  
  if (TotalVersion >= 2000){
    if (TotalVersion >= 2010){
      // PA-Coupler/Link firmware. Function-switch sets mode: update firmware of head station.
      LinkFuncText = GetOnOffText(LinkFunc);
    }
    else {
      // PA-Link firmware. Switch is ignored, function is always Link.
      LinkFuncText = GetOnOffText(1) + GetConditionalText(LinkFunc == 0," (이 PA-모듈 펌웨어는 링크 기능만 지원합니다)","");
    }
  }
  else {
    // PA-Coupler firmware. Switch is ignored, funcion is always Coupler.
    LinkFuncText = GetOnOffText(0) + GetConditionalText(LinkFunc != 0," (링크기능 사용을 위해 PA 모듈 펌웨어를 2.x(으)로 갱신하세요.)","");
  }
  
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
  SetInnerHtmlValue("LinkFuncGlobal",LinkFuncText);
  
  SetInnerHtmlValue("ChannelNum"+ChannelNum,"채널 "+(ChannelNum+1));
  SetInnerHtmlValue("StationCount"+ChannelNum,StationCount);
  SetInnerHtmlValue("LinkFunc"+ChannelNum,LinkFuncText);
  SetInnerHtmlValue("Setting"+ChannelNum,GetSwDswText(Setting));
  SetInnerHtmlValue("DcVolt"+ChannelNum,DCVoltage);
  SetInnerHtmlValue("DcPlus"+ChannelNum,DCVplus);
  SetInnerHtmlValue("DcMin"+ChannelNum,DCVmin);
  SetInnerHtmlValue("DcNoise"+ChannelNum,DCVnoise);
  SetInnerHtmlValue("DcUnbal"+ChannelNum,DCVunbal);
  SetInnerHtmlValue("Current"+ChannelNum,CurrentCons);
  
  var OffText = GetColorBallHtml(1)+" "+GetOnOffText(0);
  var OnText  = GetColorBallHtml(0)+" "+GetOnOffText(1); 
  
  SetInnerHtmlValue("LedHardware"+ChannelNum,GetConditionalText(LedSystem != 0,OnText,OffText));
  SetInnerHtmlValue("LedSignalMinMax"+ChannelNum,GetConditionalText(LedSighalLowHigh != 0,OnText,OffText));
  SetInnerHtmlValue("LedPower"+ChannelNum,GetConditionalText(LedPower != 0,OnText,OffText));
  SetInnerHtmlValue("LedNetwork"+ChannelNum,GetConditionalText(LedNetwork != 0,OnText,OffText));
    
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

    var PropertyParams = "property=page-access:mon_scope_list.htm+page-access:mon_scope_e_list.htm";
    var DataParams     = "data=pacoupler-info:"+CardSlot;
    var TotalParams    = PropertyParams + "&" + DataParams;

    xmlhttpStatusData = loadXMLDocASynch("data_srv.cgi", TotalParams, onStateChangeData, onTimeoutData);
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
  
  WriteSettingsInfo();
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
  var RightIds = new Array("Network"+ImageIdx,"Baudrate"+ImageIdx,"StationCount"+ImageIdx,"LinkFunc"+ImageIdx,"Setting"+ImageIdx,"DcVolt"+ImageIdx,"DcPlus"+ImageIdx,"DcMin"+ImageIdx,"DcNoise"+ImageIdx,"DcUnbal"+ImageIdx,"Current"+ImageIdx,"LedHardware"+ImageIdx,"LedSignalMinMax"+ImageIdx,"LedPower"+ImageIdx,"LedNetwork"+ImageIdx);
  var LeftIds  = new Array("네트워크:","전송속도:","채널에서 스테이션 카운트 활성화:","링크 기능:","설정:","DC 전압:","DC 플러스:","DC 최소:","DC 노이즈:","DC 불균형:","전류 소비량:","하드웨어 에러 LED:","Amplitude error LED:","Power error LED:","Network error LED:");

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

function SplitInto2Factors(WatchdogFactor)
{
  WatchdogFactor = parseInt(WatchdogFactor);
 
  var Result = {First: 255, Second: 255, Deviation: (256*256) };
  
  for(var x=1; x<256; x++){
    for(var y=1; y<256; y++){
      
      var CurrentValue = (x * y);
      var CurrentDev = (CurrentValue - WatchdogFactor); 
      
      if ((CurrentDev >= 0) && (CurrentDev < Result.Deviation)){ // deviation is smaller than before and positive?

        Result.First     = x;
        Result.Second    = y;
        Result.Deviation = CurrentDev;

        return Result; // if exact match, do not search any further.
      }
    }
  }
  
  return Result;
}

//-----------

function SaveLinkSettingsClick()
{
  var param1 = [];
  var param2 = [];
  
  var SupportedFeatures = 1;
    
  //----------
  
  if (GetVisibility("link_watchdog") == true){
    var SelectBoxValue = parseInt(GetSelectBoxValue("link_watchdog_type",0));
    
    var Factor1 = 30;
    var Factor2 = 10;
    
    switch (SelectBoxValue){
      case 0:
      case 1:
      case 2:
        Factor1 = 0;
        Factor2 = SelectBoxValue;
        break;
        
      case 200:
        WatchDogValue = GetTextValue("link_watchdog_factor",Factor1 * Factor2 * 10);
        if (CheckNumber(WatchDogValue,1,650250) != 0){
          alert("에러: 워치독 인수는 1에서 650250 범위이어야 합니다.");
          return;
        }
        
        var WatchDogFactor = Math.ceil(WatchDogValue/10);
        var Factors = SplitInto2Factors(WatchDogFactor);
        Factor1 = Factors.First;
        Factor2 = Factors.Second;
        
        //alert(sprintf("%s is split into factors: %s x %s + %s",WatchDogFactor,Factors.First,Factors.Second,Factors.Deviation));

        // display the rounded/calculated value
        SetTextValue("link_watchdog_factor",Factor1 * Factor2 * 10);

        break;
    }
    param2.push(Factor1);
    param2.push(Factor2);
    SupportedFeatures |= 0x0002;
  }
  else {
    param2.push(0);
    param2.push(0);
  }
  
  //----------
  
  if (GetVisibility("link_retries") == true){
    var RetryCount = GetTextValue("link_retries_value",5);
    
    if (CheckNumber(RetryCount,0,15) != 0){
      alert("에러: 재시도수는 0에서 15이어야 합니다.");
      return;
    }
    
    param2.push(RetryCount);
    SupportedFeatures |= 0x0004;
  }  
  else {
    param2.push(0);
  }
  
  //----------
  
  if (GetVisibility("link_cycle_time") == true){
    var SelectBoxValue = parseInt(GetSelectBoxValue("link_cycle_time_type",0));
    
    var CycleTime = 0;
    
    switch(SelectBoxValue){
      case 0:
        CycleTime = 0;
        break;
      
      case 1:
        CycleTime = GetTextValue("link_cycle_time_value",0);
        if (CheckNumber(CycleTime,1,65535) != 0){
          alert("에러: 싸이클 타임은 1에서 65535범위입니다.");
          return;
        }
        break;
    }   

    param2.push(CycleTime);
    SupportedFeatures |= 0x0080;
  }
  else {
    param2.push(0);
  }
  
  //----------
  
  if (GetVisibility("link_ident_adapt") == true){
    var SelectBoxValue = parseInt(GetSelectBoxValue("link_ident_adapt_value",0));
    
    param2.push(SelectBoxValue);
    SupportedFeatures |= 0x0008;
  }
  else {
    param2.push(0);
  }
  
  //----------
  
  if (GetVisibility("link_diag_block") == true){
    var SelectBoxValue = parseInt(GetSelectBoxValue("link_diag_block_value",0));
    
    param2.push(SelectBoxValue);
    SupportedFeatures |= 0x0010;
  }
  else {
    param2.push(0);
  }
  
  //----------
  
  if (GetVisibility("link_lost_behaviour") == true){
    var SelectBoxValue = parseInt(GetSelectBoxValue("link_lost_behaviour_value",0));    // & 0x04
    var CheckboxExtDiagBit = GetCheckBoxValue("link_lost_behaviour_ExtDiag",0) << 4;
    var CheckboxResDiagBit = GetCheckBoxValue("link_lost_behaviour_ResDiag",0) << 5;
    var SubstituteValue    = GetTextValue("link_lost_behaviour_substitute",0);
    
    if (CheckHex(SubstituteValue,0,255) != 0){
      alert("에러: 대체상실값은 00 에서 FF(16진수)까지입니다.");
      return;
    }
    
    if (SelectBoxValue == 0) {
      CheckboxExtDiagBit = 0;
      CheckboxResDiagBit = 0;
    }
    
    var DeviceLost = (SelectBoxValue | CheckboxExtDiagBit | CheckboxResDiagBit);
    var Substitute = parseInt(SubstituteValue,16);
    
    param2.push(DeviceLost);
    param2.push(Substitute);
    SupportedFeatures |= 0x0040;
  }
  else {
    param2.push(0);
    param2.push(0);
  }
  
  //----------
  
  if (GetVisibility("link_dpv1_block") == true){
    var SelectBoxValue = parseInt(GetSelectBoxValue("link_dpv1_block_value",0));
    
    param2.push(SelectBoxValue);
    SupportedFeatures |= 0x0020;
  }
  else {
    param2.push(0);
  }
  
  //----------

  param1.push(GetGlobalInt("CardIndex",-1));  // slot
  param1.push(SupportedFeatures);
  
  var TotalParams = param1.concat(param2);
  var CommandString = "action=pacoupler-settings:" + TotalParams.join(":");
  
  var Result = decodeURIComponent(loadXMLDocSynch("data_srv.cgi", CommandString));
  
  var ResultArray = [];
  ResultArray = Result.split("\x1F");

  //var ResultValue = parseInt(ResultArray[0],10);
  alert(ResultArray[1]);
}