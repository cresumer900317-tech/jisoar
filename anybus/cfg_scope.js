
window.onclick = function(event) 
{
	CheckMaintenanceEnableModalOnclick(event);
	CheckMaintenanceDisableModalOnclick(event);
} 

var TimerHandleData = null;

var xmlhttpStatusData = null;
var StatusDataTimeout = 0;

//-----------

var ModuleStatus = [0,0,0,0,0,0,0,0,0,0];
var ModuleType   = [0,0,0,0,0,0,0,0,0,0];

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

        var ScopeSpecificVars = [];
        var ModuleVars  = [];

        if (ControlVars.length >= 2){
          ScopeSpecificVars = ControlVars[0].split("\x1E");
          ModuleVars   = ControlVars[1].split("\x1E");
        }

        FillSpecificTable(ScopeSpecificVars,ModuleVars);

        StatusDataTimeout = 0;
        xmlhttpStatusData.onreadystatechange = function() {}
        xmlhttpStatusData.abort();
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

  var DataParams     = "data=ScopeSpecificData+ModuleInfo";
  xmlhttpStatusData = loadXMLDocASynch("data_srv.cgi", DataParams, onStateChangeData, onTimeoutData);
  StatusDataTimeout = 10;
}


//-----------

function InitializeJavascript()
{
  // set globals
  StatusDataTimeout = 0;

  // start the timer(s)
  PeriodicTimerUpdateStatusData();

  var AutoRefreshInterval = 1 * 1000;
  if (AutoRefreshInterval < 1000) AutoRefreshInterval = 1000;
  TimerHandleData = setInterval('PeriodicTimerUpdateStatusData()',AutoRefreshInterval);
}

//-----------

function GetScopeSlotRange(Slot)
{
  var Request = "data=scopeModRange";
  if (Slot != undefined){
    Request = Request + ":" + Slot;
  }

  var ScopeRangeString = decodeURIComponent(loadXMLDocSynch("data_srv.cgi", Request));
  var ScopeRange = ScopeRangeString.split("\x1F");

  for(var i=0; i<ScopeRange.length; i++){
    ScopeRange[i] = parseInt(ScopeRange[i]);
  }

  var EntireScopeRange = Math.abs(ScopeRange[1] - ScopeRange[0]);
  var SingleScopeRange = ScopeRange[1];

  var Result = {EntireRange:EntireScopeRange,SingleRange:SingleScopeRange};
  return Result;
}

//-----------

function SaveSettings()
{
  var args = [];

// global settings

  var ImageCountValue = GetSelectBoxValue("MaxImagesPerPage",-1);
  if (ImageCountValue > 0){
    args.push("setting_Scope-MaxImagesPerPage:" + encodeURIComponent(ImageCountValue) );
  }

  var ImageColor = GetSelectBoxValue("ScopeColor",-1);
  if (ImageColor != -1){
    args.push("setting_Scope-LineColor:" + encodeURIComponent(ImageColor) );
  }

  var ScopeErrorBufferType = parseInt(GetSelectBoxValue("ScopeErrorBufferType",-1));
  if (ScopeErrorBufferType != -1){
    args.push("setting_Scope-ErrorBufType:" + encodeURIComponent(ScopeErrorBufferType) );
  }
  
  args.push("setting_Scope-AutomaticallySaveImages:" + GetCheckBoxValue('AutomaticallySaveImages',1) );

// 1ch RS485 settings
  var Rs485Range = GetScopeSlotRange();

  var ScopeTermMin  = GetTextValue("dp_scope_term_min",NaN);
  var ScopeTermMax  = GetTextValue("dp_scope_term_max",NaN);
  var BargraphLimit = GetTextValue("dp_bargraph_limit",NaN);

  if (CheckNumber(ScopeTermMin,0,Rs485Range.SingleRange) != 0){
    alert("에러: 최소 종단전압이 유효하지 않은 값입니다.\n번호의 범위는 0에서부터 "+Rs485Range.SingleRange+".");
    return;
  }
  ScopeTermMin = parseInt(ScopeTermMin);

  if (CheckNumber(ScopeTermMax,0,Rs485Range.SingleRange) != 0){
    alert("에러: 최대종단전압이 유효하지 않은 값입니다.\n번호의 범위는 0에서부터 "+Rs485Range.SingleRange+".");
    return;
  }
  ScopeTermMax = parseInt(ScopeTermMax);

  if (ScopeTermMin >= ScopeTermMax){
    alert("에러: 최소 종단전압은 최대 종단전압보다 작아야 합니다.");
    return;
  }

  if (CheckNumber(BargraphLimit,0,Rs485Range.EntireRange) != 0){
    alert("에러: 바그래프 한계가 잘못된 값을 가지고 있습니다.\n번호의 범위는 0에서부터 "+Rs485Range.EntireRange+".");
    return;
  }
  BargraphLimit = parseInt(BargraphLimit);

  args.push("setting_Scope-TermMin:"      + encodeURIComponent(ScopeTermMin)  );
  args.push("setting_Scope-TermMax:"      + encodeURIComponent(ScopeTermMax)  );
  args.push("setting_Bargraph-GoodLimit:" + encodeURIComponent(BargraphLimit) );

  var GeneralSaveResult = SaveSegmentedSettingsCombined("data_srv.cgi",args,"save-settings",0);

  if (GeneralSaveResult.Code != 200){
    alert(GeneralSaveResult.Text);
    return;
  }

  // if ok...save card specific settings per module
  var LastMesssage = "알수없는 에러.";
  var SaveCount = 0;
  
  var RowNr = 0;
  for(var i=0; i<10; i++){
    
    if (ModuleStatus[i] & 0x00000004) { // module present 
      if (ModuleStatus[i] & 0x00000001) { // module specific settings
      
        if ((ModuleType[i] == 1)){ // dp modules
          SaveCount++;
    
          var ScopeTermMin  = GetTextValue("row"+(RowNr+1)+"_func1_lower_idle_edit", NaN);
          var ScopeTermMax  = GetTextValue("row"+(RowNr+1)+"_func1_upper_idle_edit", NaN);
          var BargraphLimit = GetTextValue("row"+(RowNr+1)+"_func1_lower_bargraph_edit", NaN);
    
          // check values/ranges
          var SpecificRange = GetScopeSlotRange(i);
    
          if (CheckNumber(ScopeTermMin,0,SpecificRange.SingleRange) != 0){
            alert(sprintf("에러: 카드 %s의 모듈 최소 종단전압은 유효하지 않은 값입니다.",(i+1)) + "\n" + "번호의 범위는 0에서부터 "+SpecificRange.SingleRange+".");
            return;
          }
          ScopeTermMin = parseInt(ScopeTermMin);
    
          if (CheckNumber(ScopeTermMax,0,SpecificRange.SingleRange) != 0){
            alert(sprintf("에러: 카드 %s의 모듈 최대 종단전압이 유효하지 않은 값입니다.",(i+1)) + "\n" + "번호의 범위는 0에서부터 "+SpecificRange.SingleRange+".");
            return;
          }
          ScopeTermMax = parseInt(ScopeTermMax);
    
          if (ScopeTermMin >= ScopeTermMax){
            alert(sprintf("에러: 카드 %s의 모듈 최소 종단전압은 최대 종단전압보다 작아야 합니다.",(i+1) ) );
            return;
          }
    
          if (CheckNumber(BargraphLimit,0,SpecificRange.EntireRange) != 0){
            alert(sprintf("에러: 카드 %s의 모듈 바그래프 최소한계가 잘못된 값입니다.",(i+1)) + "\n" + "번호의 범위는 0에서부터 "+SpecificRange.EntireRange+".");
            return;
          }
          BargraphLimit = parseInt(BargraphLimit);
          
          var Argument = "action=UpdateScopeSpecificDp:"+i+":"+ScopeTermMin+":"+ScopeTermMax+":"+BargraphLimit;
          var SaveResult = decodeURIComponent(loadXMLDocSynch("data_srv.cgi", Argument));
          var SaveArray = SaveResult.split("\x1F");
          if (parseInt(SaveArray[0]) != 200){
            alert(SaveArray[1]);
            return;
          }
          
          LastMesssage = SaveArray[1];
        }
        
        if ((ModuleType[i] == 2) || (ModuleType[i] == 3)){ // PA or FF modules
          SaveCount++;
  
          var BargraphMin = GetTextValue("row"+(RowNr+1)+"_func2_lower_bargraph_edit", NaN);
          var BargraphMax = GetTextValue("row"+(RowNr+1)+"_func2_upper_bargraph_edit", NaN);
          var JitterMax   = GetTextValue("row"+(RowNr+1)+"_func2_upper_jitter_edit", NaN);
          var DcVoltMin   = GetTextValue("row"+(RowNr+1)+"_func2_lower_dcvolt_edit", NaN);
          var DcVoltMax   = GetTextValue("row"+(RowNr+1)+"_func2_upper_dcvolt_edit", NaN);
          var DcNoise     = GetTextValue("row"+(RowNr+1)+"_func2_upper_dcnoise_edit", NaN);
          //var DcUnbalance = GetTextValue("row"+(RowNr+1)+"_func2_upper_dcunbalance_edit", NaN);
          var DcCurrent   = GetTextValue("row"+(RowNr+1)+"_func2_upper_dccurrent_edit", NaN);
          
          // check values/ranges
          var SpecificRange = GetScopeSlotRange(i);

          //checking of ranges of pa variables
          if (CheckNumber(BargraphMin,0,SpecificRange.EntireRange) != 0){
            alert(sprintf("에러: 카드 %s의 모듈 바그래프 최소한계가 잘못된 값입니다.",(i+1)) + "\n" + sprintf("번호는 %s에서 %s까지의 범위이어야 합니다.",0,SpecificRange.EntireRange));
            return;
          }
          BargraphMin = parseInt(BargraphMin);
          
          if (CheckNumber(BargraphMax,0,SpecificRange.EntireRange) != 0){
            alert(sprintf("에러: 카드 %s의 모듈 바그래프 최대한계가 잘못된 값입니다.",(i+1)) + "\n" + sprintf("번호는 %s에서 %s까지의 범위이어야 합니다.",0,SpecificRange.EntireRange));
            return;
          }
          BargraphMax = parseInt(BargraphMax);
          
          if (BargraphMin >= BargraphMax){
            alert(sprintf("에러: 카드 %s의 모듈 바그래프 최소한계는 바그래프 최대한계보다 작아야 합니다.",(i+1) ) );
            return;
          }
          
          //-----------
          
          if (CheckNumber(JitterMax,1,8000) != 0){
            alert(sprintf("에러: 카드 %s의 모듈 신호불안정-최대값이 유효하지 않은 값입니다.",(i+1)) + "\n" + sprintf("번호는 %s에서 %s까지의 범위이어야 합니다.",0,8000));
            return;
          }
          JitterMax = parseInt(JitterMax);
          
          //-----------
          
          if (CheckNumber(DcVoltMin,9000,64000) != 0){
            alert(sprintf("에러: 카드 %s의 모듈 DC최소전압이 유효하지 않은 값입니다.",(i+1)) + "\n" +  sprintf("번호는 %s에서 %s까지의 범위이어야 합니다.",9000,64000));
            return;
          }
          DcVoltMin = parseInt(DcVoltMin);
          
          if (CheckNumber(DcVoltMax,9000,64000) != 0){
            alert(sprintf("에러: 카드 %s의 모듈 DC최대전압이 유효하지 않은 값입니다.",(i+1)) + "\n" + sprintf("번호는 %s에서 %s까지의 범위이어야 합니다.",9000,64000));
            return;
          }
          DcVoltMax = parseInt(DcVoltMax);
          
          if (DcVoltMin >= DcVoltMax){
            alert(sprintf("에러: 카드 %s의 모듈 DC최소전압은 DC최대전압보다 작아야 합니다.",(i+1) ) );
            return;
          }
          
          //-----------
          
          if (CheckNumber(DcNoise,0,SpecificRange.EntireRange) != 0){
            alert(sprintf("에러: 카드 %s의 모듈 DC최대노이즈가 유효하지 않은 값입니다.",(i+1)) + "\n" + sprintf("번호는 %s에서 %s까지의 범위이어야 합니다.",0,SpecificRange.EntireRange));
            return;
          }
          DcNoise = parseInt(DcNoise);
          
          //-----------
          /*
          if (CheckNumber(DcUnbalance,0,10000) != 0){
            alert(sprintf("에러: 카드 %s의 모듈 DC최대불균형이 유효하지 않은 값입니다.",(i+1)) + "\n" + "번호의 범위는 0에서부터 "+10000+".");
            return;
          }
          DcUnbalance = parseInt(DcUnbalance);
          */
          //-----------
          
          if (CheckNumber(DcCurrent,0,1000) != 0){
            alert(sprintf("에러: 카드 %s의 모듈 DC최대전류가 유효하지 않은 값입니다.",(i+1)) + "\n" + sprintf("번호는 %s에서 %s까지의 범위이어야 합니다.",0,1000));
            return;
          }
          DcCurrent = parseInt(DcCurrent);
          
          //-----------
    
          var Argument = "action=UpdateScopeSpecificMBP:"+i+":"+BargraphMin+":"+BargraphMax+":"+JitterMax+":"+DcVoltMin+":"+DcVoltMax+":"+DcNoise+":"+DcCurrent;
          var SaveResult = decodeURIComponent(loadXMLDocSynch("data_srv.cgi", Argument));
          var SaveArray = SaveResult.split("\x1F");
          if (parseInt(SaveArray[0]) != 200){
            alert(SaveArray[1]);
            return;
          }
          
          LastMesssage = SaveArray[1];
        }
      }
      RowNr++;
    }
  }
  
  if (SaveCount > 0){
    alert(LastMesssage);
  }
}

//-----------

function FillSpecificTable(ScopeSpecificVars,ModuleVars)
{
  var TableObj = document.getElementById("SpecificList");

  var ModuleSlotArray    = [];
  var ScopeSpecificArray = [];
  var ModuleInfoArray    = [];
  
  for(var i=0; i<ScopeSpecificVars.length; i++){
    if (ScopeSpecificVars[i].length > 0){
      var CurrentSpec = ScopeSpecificVars[i].split("\x1F");
      for(var j=0; j<CurrentSpec.length; j++){
        CurrentSpec[j] = parseInt(CurrentSpec[j]);
      }
      ModuleSlotArray.push(i);
      ScopeSpecificArray.push(CurrentSpec);
      ModuleInfoArray.push(ModuleVars[i].split("\x1F"));
    }
  }
  
  for(var i=0; i<ScopeSpecificArray.length; i++){
    FillRowContent(i,ModuleSlotArray[i],ScopeSpecificArray[i],ModuleInfoArray[i]);
  }
  
  for(var i=ScopeSpecificArray.length; i<10; i++){
    HideRow(i);
  }
}

//-----------

function HideRow(RowIdx)
{
  SetVisibility("row"+(RowIdx+1),false);
}

//-----------

function FillModuleNameCell(RowNr, Context, Identifier)
{
  var DivId = "row" + (RowNr+1) + "_module";
  SetInnerHtmlValue(DivId,Context);

  if (Identifier != undefined){
    var obj = document.getElementById(DivId);
    var Changed = false;

    if (obj != null){
      if (obj.id_value_change != Identifier){
        obj.id_value_change = Identifier;
        Changed = true;
      }
    }
  }

  return Changed;
}

//-----------

function SetScopeMeasValue(VarId,Editable,NonEditText,EditText)
{
  SetInnerHtmlValue(VarId,NonEditText);
  SetTextValue(VarId+"_edit",EditText);
  SetVisibility(VarId+"_edit",Editable);
}

//-----------

function FillRowContent(RowIdx,ModuleSlot,SpecificVars,ModuleVars)
{
  var TableObj = document.getElementById("SpecificList");
  if (TableObj == null) return null;
  
  SetVisibility("row"+(RowIdx+1),true,GetBrowserDisplayStyle("table-row"));
  SetInnerHtmlValue("row"+(RowIdx+1)+"_slot",ModuleSlot+1);
  
  ModuleStatus[ModuleSlot] = SpecificVars[2];
  ModuleType[ModuleSlot]   = SpecificVars[1];
  var KnownCardType = false;
  var BrowserTableType = GetBrowserDisplayStyle("table");
  
  if (SpecificVars[1] == 1){ // dp card
    KnownCardType = true;
    
    // show the correct cells
    SetVisibility("row"+(RowIdx+1)+"_func1_var",true,BrowserTableType);
    SetVisibility("row"+(RowIdx+1)+"_func2_var",false);
    SetVisibility("row"+(RowIdx+1)+"_func1_val",true,BrowserTableType);
    SetVisibility("row"+(RowIdx+1)+"_func2_val",false);
    SetVisibility("row"+(RowIdx+1)+"_func1_lower",true,BrowserTableType);
    SetVisibility("row"+(RowIdx+1)+"_func2_lower",false);
    SetVisibility("row"+(RowIdx+1)+"_func1_upper",true,BrowserTableType);
    SetVisibility("row"+(RowIdx+1)+"_func2_upper",false);
    
    // show the measure values
    var IdleValue     = parseInt(SpecificVars[6]);
    var BargraphValue = parseInt(SpecificVars[7]);
    var UsableValues  = false;
    var IdleId     = "row"+(RowIdx+1)+"_func1_val_idle";
    var BargraphId = "row"+(RowIdx+1)+"_func1_val_bargraph";
  
    if ((IdleValue == 0) && (BargraphValue == -1)){
      SetInnerHtmlValue(IdleId,"알수없음");
      SetInnerHtmlValue(BargraphId,"알수없음");
    }
    else {
      if ((SpecificVars[0] & 0x80) != 0){
        SetInnerHtmlValue(IdleId,IdleValue+" mV");
      }
      else {
        SetInnerHtmlValue(IdleId,"알수없음");
      }
      if (BargraphValue > 0){
        SetInnerHtmlValue(BargraphId,BargraphValue+" mV");
      }
      else {
        SetInnerHtmlValue(BargraphId,"알수없음");
      }
      UsableValues = true;
    }
    
    var ModuleName = GetTextForModuleStatus(ModuleVars);
    if (ModuleVars.length >= 8){
      ModuleName = ModuleVars[4];
	    if (ModuleVars[10].length > 0){
	      ModuleName = ModuleName + "<br>" + ModuleVars[10];
  	  }
    }
    var Identifier = ModuleName +"/"+ SpecificVars[3] +"/"+ SpecificVars[4] +"/"+ SpecificVars[5] + "/" + UsableValues;
    
    if (FillModuleNameCell(RowIdx,ModuleName,Identifier) == true){ // new type, change settings
      
      var IdleLowId          = "row"+(RowIdx+1)+"_func1_lower_idle";
      var IdleHighId         = "row"+(RowIdx+1)+"_func1_upper_idle";
      var BargraphLowId      = "row"+(RowIdx+1)+"_func1_lower_bargraph";
      var BargraphHighId     = "row"+(RowIdx+1)+"_func1_upper_bargraph";
      
      if (SpecificVars[2] & 0x00000001){ // mod specific values
        SetScopeMeasValue(IdleLowId,true,"",SpecificVars[3]);
        SetScopeMeasValue(IdleHighId,true,"",SpecificVars[4]);
        SetScopeMeasValue(BargraphLowId,true,"",SpecificVars[5]);
        SetScopeMeasValue(BargraphHighId,false,"","");
        
        SetVisibility("row"+(RowIdx+1)+"_align",true);
        SetVisibility("row"+(RowIdx+1)+"_reset",true);
        
      }
      else {
        SetScopeMeasValue(IdleLowId,false,"위 테이블을 사용하세요","");
        SetScopeMeasValue(IdleHighId,false,"위 테이블을 사용하세요","");
        SetScopeMeasValue(BargraphLowId,false,"위 테이블을 사용하세요","");
        SetScopeMeasValue(BargraphHighId,false,"","");
        
        SetVisibility("row"+(RowIdx+1)+"_align",false);
        SetVisibility("row"+(RowIdx+1)+"_reset",false);
      }
    }
  }
  
  if ((SpecificVars[1] == 2) || (SpecificVars[1] == 3)){ // PA or FF card
    KnownCardType = true;
    
    SetVisibility("row"+(RowIdx+1)+"_func1_var",false);
    SetVisibility("row"+(RowIdx+1)+"_func2_var",true,BrowserTableType);    
    SetVisibility("row"+(RowIdx+1)+"_func1_val",false);
    SetVisibility("row"+(RowIdx+1)+"_func2_val",true,BrowserTableType);    
    SetVisibility("row"+(RowIdx+1)+"_func1_lower",false);
    SetVisibility("row"+(RowIdx+1)+"_func2_lower",true,BrowserTableType);    
    SetVisibility("row"+(RowIdx+1)+"_func1_upper",false);
    SetVisibility("row"+(RowIdx+1)+"_func2_upper",true,BrowserTableType);
    
    // show the measure values
    var BargraphMinValue = parseInt(SpecificVars[18]);
    var BargraphMaxValue = parseInt(SpecificVars[19]);
    var JitterValue      = parseInt(SpecificVars[12]);
    var DcVoltValue      = parseInt(SpecificVars[14]);
    var DcNoiseValue     = parseInt(SpecificVars[15]);
    //var DcUnbalanceValue = parseInt(SpecificVars[16]);
    var DcCurrent        = parseInt(SpecificVars[17]);

    if ((BargraphMinValue == -1) && (BargraphMaxValue == 0)){
      SetInnerHtmlValue("row"+(RowIdx+1)+"_func2_val_bargraph","알수없음");
      SetInnerHtmlValue("row"+(RowIdx+1)+"_func2_val_jitter"  ,"알수없음");
    }
    else {
      SetInnerHtmlValue("row"+(RowIdx+1)+"_func2_val_bargraph","최소: "+BargraphMinValue+" mV"+"<br>"+"최대: "+BargraphMaxValue+" mV");
      SetInnerHtmlValue("row"+(RowIdx+1)+"_func2_val_jitter"  ,JitterValue+" nS");
    }
    
    SetInnerHtmlValue("row"+(RowIdx+1)+"_func2_val_dcvolt"     ,DcVoltValue  +" mV");
    SetInnerHtmlValue("row"+(RowIdx+1)+"_func2_val_dcnoise"    ,DcNoiseValue+" mV");
    //SetInnerHtmlValue("row"+(RowIdx+1)+"_func2_val_dcunbalance",DcUnbalanceValue+" %");
    SetInnerHtmlValue("row"+(RowIdx+1)+"_func2_val_dccurrent"  ,DcCurrent+" mA");

    var ModuleName = GetTextForModuleStatus(ModuleVars);
    if (ModuleVars.length >= 8){
      ModuleName = ModuleVars[4];
	    if (ModuleVars[10].length > 0){
	      ModuleName = ModuleName + "<br>" + ModuleVars[10];
  	  }
    }
    var Identifier = ModuleName +"/"+ SpecificVars[3] +"/"+ SpecificVars[4] +"/"+ SpecificVars[5] +"/"+ SpecificVars[7] +"/"+ SpecificVars[8] +"/"+ SpecificVars[9] +"/"+ SpecificVars[10] +"/"+ SpecificVars[11];
        
    if (FillModuleNameCell(RowIdx,ModuleName,Identifier) == true){ // new type, change settings
      
      var BargraphLowId      = "row"+(RowIdx+1)+"_func2_lower_bargraph";
      var BargraphHighId     = "row"+(RowIdx+1)+"_func2_upper_bargraph";
      var JitterLowId        = "row"+(RowIdx+1)+"_func2_lower_jitter";
      var JitterHighId       = "row"+(RowIdx+1)+"_func2_upper_jitter";
      var DcVoltLowId        = "row"+(RowIdx+1)+"_func2_lower_dcvolt";
      var DcVoltHighId       = "row"+(RowIdx+1)+"_func2_upper_dcvolt";
      var DcNoiseLowId       = "row"+(RowIdx+1)+"_func2_lower_dcnoise";
      var DcNoiseHighId      = "row"+(RowIdx+1)+"_func2_upper_dcnoise";
      //var DcUnbalanceLowId   = "row"+(RowIdx+1)+"_func2_lower_dcunbalance";
      //var DcUnbalanceHighId  = "row"+(RowIdx+1)+"_func2_upper_dcunbalance";
      var DcCurrentLowId     = "row"+(RowIdx+1)+"_func2_lower_dccurrent";
      var DcCurrentHighId    = "row"+(RowIdx+1)+"_func2_upper_dccurrent";

      if (SpecificVars[2] & 0x00000001){ // mod specific values
        SetScopeMeasValue(BargraphLowId     ,true ,"",SpecificVars[3]);
        SetScopeMeasValue(BargraphHighId    ,true ,"",SpecificVars[4]);
        SetScopeMeasValue(JitterLowId       ,false,"","");
        SetScopeMeasValue(JitterHighId      ,true ,"",SpecificVars[5]);
        SetScopeMeasValue(DcVoltLowId       ,true ,"",SpecificVars[7]);
        SetScopeMeasValue(DcVoltHighId      ,true ,"",SpecificVars[8]);
        SetScopeMeasValue(DcNoiseLowId      ,false,"","");
        SetScopeMeasValue(DcNoiseHighId     ,true ,"",SpecificVars[9]);
        //SetScopeMeasValue(DcUnbalanceLowId  ,false,"","");
        //SetScopeMeasValue(DcUnbalanceHighId ,true ,"",SpecificVars[10]);
        SetScopeMeasValue(DcCurrentLowId    ,false,"","");
        SetScopeMeasValue(DcCurrentHighId   ,true ,"",SpecificVars[11]);
        
        SetVisibility("row"+(RowIdx+1)+"_align",true);
        SetVisibility("row"+(RowIdx+1)+"_reset",true);
      }
      else {
        SetScopeMeasValue(BargraphLowId     ,false,"","");
        SetScopeMeasValue(BargraphHighId    ,false,"","");
        SetScopeMeasValue(JitterLowId       ,false,"","");
        SetScopeMeasValue(JitterHighId      ,false,"","");
        SetScopeMeasValue(DcVoltLowId       ,false,"","");
        SetScopeMeasValue(DcVoltHighId      ,false,"","");
        SetScopeMeasValue(DcNoiseLowId      ,false,"","");
        SetScopeMeasValue(DcNoiseHighId     ,false,"","");
        //SetScopeMeasValue(DcUnbalanceLowId  ,false,"","");
        //SetScopeMeasValue(DcUnbalanceHighId ,false,"","");
        SetScopeMeasValue(DcCurrentLowId    ,false,"","");
        SetScopeMeasValue(DcCurrentHighId   ,false,"","");

        SetVisibility("row"+(RowIdx+1)+"_align",false);
        SetVisibility("row"+(RowIdx+1)+"_reset",false);
      }      
    }
  }
  
  if (KnownCardType == false){
    // hide all? make notification?
  }
}

//-----------

/*
function FillSpecificRowDp(RowNr, SpecificContent, ModuleContent)
{
  var RowScopeId = "dp";
  
  var SpecificData = [];
  var ModuleData  = [];
  SpecificData = SpecificContent.split("\x1F");
  ModuleData  = ModuleContent.split("\x1F");

  for(var i=0; i<SpecificData.length; i++){
    SpecificData[i] = parseInt(SpecificData[i]);
    if (isNaN(SpecificData[i])) SpecificData[i] = 0;
  }

  if (SpecificData[0] == 0){  
    
    // is no card... clear the flags
    ModuleType[RowNr]   = 0;
    ModuleStatus[RowNr] = 0;

    // clear/hide the row
    SetTextValue(RowScopeId+"_scope_term_min" + RowNr,"");
    SetTextValue(RowScopeId+"_scope_term_max" + RowNr,"");
    SetTextValue(RowScopeId+"_bargraph_limit" + RowNr,"");
    
    FillModuleCell(RowNr,2,RowScopeId,"","");
    ShowHideChannel(RowNr,RowScopeId,false);
    ShowComment(RowNr,RowScopeId,false);
    
    return;
  }

  if (SpecificData[0] != 1){  // is not dp card... do not handle it here
    return;
  }
  
  ModuleType[RowNr]   = SpecificData[0];
  ModuleStatus[RowNr] = SpecificData[1];

  var Errors = 0;

  var IdleId = RowScopeId+"_row"+RowNr+"_6";
  var BargraphId = RowScopeId+"_row"+RowNr+"_7";
  var UsableVoltageValues = false;
  
  var IdleValue = parseInt(SpecificData[5]);
  var BargraphValue = parseInt(SpecificData[6]);

  if ((IdleValue == 0) && (BargraphValue == -1)){
    SetInnerHtmlValue(IdleId,"알수없음");
    SetInnerHtmlValue(BargraphId,"알수없음");
  }
  else {
    SetInnerHtmlValue(IdleId,IdleValue+" mV");
    if (BargraphValue > 0){
      SetInnerHtmlValue(BargraphId,BargraphValue+" mV");
    }
    else {
      SetInnerHtmlValue(BargraphId,"알수없음");
    }
    UsableVoltageValues = true;
  }
  

  var ModuleName = GetTextForModuleStatus(ModuleContent);
  if (ModuleData.length >= 8) ModuleName = ModuleData[4];
  var Identifier = ModuleName +"/"+ SpecificData[2] +"/"+ SpecificData[3] +"/"+ SpecificData[4] + "/" + UsableVoltageValues;
  if (FillModuleCell(RowNr,1,RowScopeId,ModuleName,Identifier) == false) return;
  
  FillModuleCell(RowNr,2,RowScopeId,"Ch 1");

  if (SpecificData[1] & 0x00000001){ // mod specific values
    SetTextValue(RowScopeId+"_scope_term_min" + RowNr,SpecificData[2]);
    SetTextValue(RowScopeId+"_scope_term_max" + RowNr,SpecificData[3]);
    SetTextValue(RowScopeId+"_bargraph_limit" + RowNr,SpecificData[4]);

    ShowHideChannel(RowNr,RowScopeId,true);
    ShowComment(RowNr,RowScopeId,false);
  }
  else {
    SetTextValue(RowScopeId+"_scope_term_min" + RowNr,"");
    SetTextValue(RowScopeId+"_scope_term_max" + RowNr,"");
    SetTextValue(RowScopeId+"_bargraph_limit" + RowNr,"");

    ShowHideChannel(RowNr,RowScopeId,false);
    if (UsableVoltageValues == true){
      ShowComment(RowNr,RowScopeId,"위의 테이블을 사용하세요");
    }
    else {
      ShowComment(RowNr,RowScopeId,"적용되지 않음");
    }
  }
}

//-----------

function ShowComment(RowNr,ScopeType,Content)
{
  var DivId = ScopeType + "_row" + (RowNr) + "_3_comment"
  if (Content == false){
    SetVisibility(DivId,false);
    SetInnerHtmlValue(DivId,"");
  }
  else {
    SetVisibility(DivId,true);
    SetInnerHtmlValue(DivId,Content);
  }
}

//-----------

function FillModuleCell(RowNr, CellNr, ScopeType, Context, Identifier)
{
  var DivId = ScopeType + "_row" + (RowNr) + "_" + (CellNr);
  SetInnerHtmlValue(DivId,Context);

  if (Identifier != undefined){
    var obj = document.getElementById(DivId);
    var Changed = false;

    if (obj != null){
      if (obj.id_value_change != Identifier){
        obj.id_value_change = Identifier;
        Changed = true;
      }
    }
  }

  return Changed;
}

//-----------

function ShowHideChannel(RowNr,ScopeType,ShowOrHide)
{
  for( var i=3; i<6; i++){
    var DivId = ScopeType+"_row" + (RowNr) + "_" + (i);
    SetVisibility(DivId,ShowOrHide);
  }
  FixFooter();
}

//-----------
*/
function ResetSettings(RowNr)
{
  var SlotNr = -1;
  var CurrentRow = RowNr;
  for(var i=0; i<ModuleStatus.length; i++){
    if (ModuleStatus[i] != 0){
      if (CurrentRow == 0){
        SlotNr = i;
        break;
      }
      CurrentRow--;
    }
  }
  
  if (SlotNr < 0){
    alert("유효하지 않은 카드");
  }
  
  if (confirm(sprintf("카드 %s의 스코프 모듈의 설정을 초기화하시겠습니까?",SlotNr+1) ) == true){
    var ResetResult = decodeURIComponent(loadXMLDocSynch("data_srv.cgi", "action=ResetScopeSpecific:"+SlotNr));
    
    var ResetArray = [];  
    ResetArray = ResetResult.split("\x1F");
    
    if (parseInt(ResetArray[0]) != 200){
      alert(ResetArray[1]);
    }
  }
}