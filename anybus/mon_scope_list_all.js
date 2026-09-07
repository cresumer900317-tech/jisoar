
window.onclick = function(event) 
{
	CheckMaintenanceEnableModalOnclick(event);
	CheckMaintenanceDisableModalOnclick(event);
} 

var TimerHandleData = null;
var xmlhttpStatusData = null;
var StatusDataTimeout = 0;

var MaxImagesPerPage = 9;
var ImageColor = "#B000B0";

var CurrentUpdateIndex = 0;
var CurrentPageIndex = 0;
var StationsOnThisPage = 6;
var StationsTotal = 6;

var xmlhttpAction = null;

var xmlhttpImageData = null;
var ImageDataTimeout = 0;

var paper = [];
var TableIds = [];

//-----------

function UpdateStationsOnThisPage()
{
  StationsOnThisPage = StationsTotal - (CurrentPageIndex*MaxImagesPerPage);
  if (StationsOnThisPage > MaxImagesPerPage) StationsOnThisPage = MaxImagesPerPage;
  if (StationsOnThisPage < 0) StationsOnThisPage = 0;

  var ScopeTypeIndex = GetSelectBoxValue('scopetype_index',2);

  while(TableIds.length < StationsOnThisPage){
    var CurrentIndex = TableIds.length;
    TableIds.push(DynamicCreateTable(CurrentIndex,ScopeTypeIndex));
    InvalidateImage(CurrentIndex,ScopeTypeIndex);
  }

  while(TableIds.length > StationsOnThisPage){
    var ImgIndex = (TableIds.length-1);
    DynamicRemoveTable(TableIds.pop(),ImgIndex);
  }
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

        var SectionVars = Response.split("\x1d");
        var MeasMethod  = "";
        var ErrorPendingCount = 0;
                
        if (SectionVars.length >= 2){
          StationsTotal = SectionVars[0];
          MeasMethod    = SectionVars[1];
          ErrorPendingCount = SectionVars[2];
        }
        UpdateStationsOnThisPage();

        CurrentPageIndex = UpdatePages(StationsTotal,CurrentPageIndex,MaxImagesPerPage,MeasMethod);
        SetInnerHtmlValue('images_pending',"&nbsp;("+ErrorPendingCount+" 모듈에 보류된 이미지)" );

        onTimeoutData();
        UpdateImageData();
      }
    }
  }
}

//-----------

function UpdatePages(TotalStations,CurrentPage,StationsPerPage,MeasMethod)
{
  TotalStations = parseInt(TotalStations);
  var PageCount = Math.ceil(TotalStations / StationsPerPage);
  var HtmlInsideDiv = [];
  HtmlInsideDiv.push("<div style='width:200px;text-align:center' class='VariableWx'>Total images: "+TotalStations+"</div>");
  HtmlInsideDiv.push("<div style='width:300px;text-align:center' class='VariableWx'>측정 방법: "+MeasMethod+"</div>");

  if (PageCount > 0){
    HtmlInsideDiv.push("<div style='width:50px;text-align:center;clear:left' class='VariableWx'>페이지:</div>");
  }

  var PageButtonArray = [];
  for(var PageIndex=0; PageIndex < PageCount; PageIndex++){
    PageButtonArray.push((PageIndex+1).toString(10));
  }

  while((PageButtonArray.length <= CurrentPage) && (CurrentPage > 0)){
    CurrentPage--;
  }
  PageButtonArray = ReducePages(PageButtonArray,CurrentPage);

  var AllowDisplayDots = 1;
  for(var PageIndex=0; PageIndex< PageCount; PageIndex++){
    var CurrentItem = PageButtonArray[PageIndex];
    if (CurrentItem.length > 0){
      if (PageIndex == CurrentPage){
        HtmlInsideDiv.push("<div style='cursor: pointer;width:38px;text-align:center;font-weight:bold;text-decoration:underline;' class='VariableWx' onClick='UpdateSelectedPage("+PageIndex+")'>"+CurrentItem+"</div>");
      }
      else {
        HtmlInsideDiv.push("<div style='cursor: pointer;width:38px;text-align:center;font-weight:bold;' class='VariableWx' onClick='UpdateSelectedPage("+PageIndex+")'>"+CurrentItem+"</div>");
      }
      AllowDisplayDots = 1;
    }
    else {
      if (AllowDisplayDots != 0){
        HtmlInsideDiv.push("<div class='VariableWx' style='width:38px;text-align:center'>...</div>");
        AllowDisplayDots = 0;
      }
    }
  }
  
  SetInnerHtmlValue('PagesArea',HtmlInsideDiv.join(""));
  return CurrentPage;
}

//-----------

function UpdateSelectedPage(NewPage)
{
  CurrentUpdateIndex = 0;
  if (NewPage < 0) return;
  var Refresh = (CurrentPageIndex != NewPage);
  CurrentPageIndex = NewPage;
  if (Refresh == true){
    UpdateStationsOnThisPage();
    var ScopeTypeIndex = GetSelectBoxValue('scopetype_index',0);
    InvalidateAllImages(ScopeTypeIndex);
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


  var ScopeCardIndex = GetSelectBoxValue('scopecard_index',-1);
  var ScopeTypeIndex = GetSelectBoxValue('scopetype_index',-1);

  var DataParams     = "data=scopeImageCount:"+ScopeCardIndex+":"+ScopeTypeIndex+"+ScopeMeasMethod:"+ScopeCardIndex+"+scopeErrorPendCount:"+ScopeCardIndex;
  xmlhttpStatusData = loadXMLDocASynch("data_srv.cgi", DataParams, onStateChangeData, onTimeoutData);
  StatusDataTimeout = 10;
  
  SetVisibility("refreshErrorImages",ScopeTypeIndex == 1); // only show when error-images are selected
}

//-----------

function InitializeJavascript()
{
  var ScopeCard = GetGlobalInt("CardIndex",0);
  SetSelectBoxValue('scopecard_index',ScopeCard);

  var ScopeType = GetGlobalInt("ScopeType",2);
  SetSelectBoxValue('scopetype_index',ScopeType);

  // start the timer(s)
  PeriodicTimerUpdateStatusData();

  var AutoRefreshInterval = 1 * 1000;
  if (AutoRefreshInterval < 1000) AutoRefreshInterval = 1000;
  TimerHandleData = setInterval('PeriodicTimerUpdateStatusData()',AutoRefreshInterval);
}

//-----------

function GetPlusOrMinusButtonHtml(Plus,table_id,ReturnValue)
{
  var HtmlCode = "<img src='btn_minus.gif' class='PointerCursor' onclick='ShowOrHideExtraInfo(\""+table_id+"\")' alt='-' title='추가정보 숨김'>";
  if (Plus == true){
    HtmlCode   = "<img src='btn_plus.gif'  class='PointerCursor' onclick='ShowOrHideExtraInfo(\""+table_id+"\")' alt='+' title='추가 정보 표시'>";
  }
  if (ReturnValue == false){
    SetInnerHtmlValue(table_id+"_btn",HtmlCode);
  }
  return HtmlCode;
}


//-----------

function ShowOrHideExtraInfo(table_id)
{
  var RowNr = 3;
  while(1){
    var RowId = table_id + "_" + RowNr;
    var RowObj = document.getElementById(RowId);
    if (RowObj == null) break;
    if (RowObj.style.display == "none"){
      RowObj.style.display = GetBrowserDisplayStyle("table-row");
      GetPlusOrMinusButtonHtml(false,table_id,false);
    }
    else {
      RowObj.style.display = "none";
      GetPlusOrMinusButtonHtml(true,table_id,false);
    }
    RowNr++;
  }
}

//-----------

function AddCellsToRowTypeOther(RowObj, RowNumber, TableId, LeftCellText, RightCellId)
{
  var RowMod = ((RowNumber+1) % 2);

  RowObj.id = TableId + "_" + RowNumber;

  var CurrentCell1 = RowObj.insertCell(-1);
  CurrentCell1.className = "TableCell R"+RowMod+"Left";
  CurrentCell1.innerHTML = LeftCellText;
  CurrentCell1.style.width = "70px";

  var CurrentCell2 = RowObj.insertCell(-1);
  CurrentCell2.id = TableId+"_"+RightCellId;
  CurrentCell2.className = "TableCell R"+RowMod+"Left";
  CurrentCell2.innerHTML = "";
  CurrentCell2.style.width = "160px";
  CurrentCell2.colSpan = "3";

  if (RowNumber == 1){
    CurrentCell2.style.width = "100px";
    CurrentCell2.colSpan = "1";

    var CurrentCell3 = RowObj.insertCell(-1);
    CurrentCell3.id = TableId+"_LivelistCell";
    CurrentCell3.className = "TableCell R"+RowMod+"Center";
    CurrentCell3.style.width = "20px";
    CurrentCell3.innerHTML = "<img src='btn_empty.gif' id='"+TableId+"_Livelist' title='Livelist state'>";

    var CurrentCell4 = RowObj.insertCell(-1);
    CurrentCell4.id = TableId+"_btn";
    CurrentCell4.className = "TableCell R"+RowMod+"Center";
    CurrentCell4.style.width = "20px";
    CurrentCell4.innerHTML = GetPlusOrMinusButtonHtml(true,TableId,true);
  }

  if (RowNumber > 2){
    RowObj.style.display = "none";
  }
}

//-----------

function AddCellsToRowTypeError(RowObj, RowNumber, TableId, LeftCellText, RightCellId)
{
  var RowMod = ((RowNumber+1) % 2);

  RowObj.id = TableId + "_" + RowNumber;

  var CurrentCell1 = RowObj.insertCell(-1);
  CurrentCell1.className = "TableCell R"+RowMod+"Left";
  CurrentCell1.innerHTML = LeftCellText;
  CurrentCell1.style.width = "90px";

  var CurrentCell2 = RowObj.insertCell(-1);
  CurrentCell2.id = TableId+"_"+RightCellId;
  CurrentCell2.className = "TableCell R"+RowMod+"Left";
  CurrentCell2.innerHTML = "";
  CurrentCell2.style.width = "140px";
}

//-----------

function DynamicCreateTable(ImageIdx, ScopeType)
{
  var CurrentTable = document.createElement("table");
  CurrentTable.className = "ConfigTable table_scopeimage";
  CurrentTable.id = "SmallImage"+ImageIdx;
  CurrentTable.cellSpacing = "0";
  
  var RightIds = new Array("Image","Address","Timestamp","Tagname","IdentNr","Model","Lost","Repeats","Illegals");
  var LeftIds  = new Array("이미지","국번(Address):","Timestamp:","Tag name:","ID 번호:","모델:","분실(Lost):","반복(Repeats):","잘못된 데이터(Illegals):");

  if (ScopeType == 1){
    RightIds = new Array("Image","ErrorType","Timestamp","DeleteImage");
    LeftIds = new Array("이미지","에러 형태:","Timestamp:","이미지 삭제:");  	
  }

  // create header
  var CurrentRow = CurrentTable.insertRow(-1);
  if (CurrentRow != null){
    var CurrentCell1 = document.createElement("TH");

    CurrentCell1.id = CurrentTable.id+"_"+RightIds[0];
    CurrentCell1.colSpan = "4";
    CurrentCell1.className = "TableCell header-cell header-left header-last PointerCursor";
    CurrentCell1.onclick=function(){ScopeImageClick('SmallImage'+ImageIdx); };

    var ScopeDiv = document.createElement("div");
    ScopeDiv.id = "SmallImage"+ImageIdx+"_Scope";
    ScopeDiv.className = "scopeimage_small";

    CurrentCell1.appendChild(ScopeDiv);
    CurrentRow.appendChild(CurrentCell1);
  }

  // create other rows
  for(var rowidx=1; rowidx<RightIds.length; rowidx++){
    CurrentRow = CurrentTable.insertRow(-1);
    if (ScopeType == 1){
    	AddCellsToRowTypeError(CurrentRow,rowidx,CurrentTable.id,LeftIds[rowidx],RightIds[rowidx]);
    }
    else {
    	AddCellsToRowTypeOther(CurrentRow,rowidx,CurrentTable.id,LeftIds[rowidx],RightIds[rowidx]);
    }
  }

  var ContentArea = document.getElementById("small_images_area");
  if (ContentArea != null){
    var ContentDivId = "small_images_area"+parseInt(ImageIdx/3);
    var ContentDiv = document.getElementById(ContentDivId);
    if (ContentDiv == null){
      ContentDiv = document.createElement("div");
      ContentDiv.className = "RowOfMultipleTables";
      ContentDiv.id = ContentDivId;
      ContentArea.appendChild(ContentDiv);
    }
    ContentDiv.appendChild(CurrentTable);
  }

  paper.push(GenerateScopeImageSmall(CurrentTable.id+'_Scope'));

  return CurrentTable.id;
}

//-----------

function DynamicRemoveTable(ImageId,ImageIdx)
{
  var Table = document.getElementById(ImageId);
  if (Table != null){
    var PaperObject = paper.pop();
    PaperObject.clear();
    PaperObject.remove();
    var ContentArea = document.getElementById("small_images_area");
    if (ContentArea != null){
      var ContentDivId = "small_images_area"+parseInt(ImageIdx/3);
      var ContentDiv = document.getElementById(ContentDivId);
      if (ContentDiv != null){
        ContentDiv.removeChild(Table);
        if (ContentDiv.hasChildNodes() == false){
          ContentArea.removeChild(ContentDiv);
        }
      }
    }
  }
}

//-----------

function onTimeoutImage()
{
  ImageDataTimeout = 0;
  xmlhttpImageData.onreadystatechange = function() {}
  xmlhttpImageData.abort();
}

//-----------

function onStateChangeImage()
{
  if (xmlhttpImageData != null){
    if (xmlhttpImageData.readyState == 4){
      if (xmlhttpImageData.status == 200){

        var Response = decodeURIComponent(xmlhttpImageData.responseText);

        var SectionVars = [];

        var ScopeType         = 0;
        var ImageIndex        = 0;
        var AbsoluteStation   = 0;
        var ScopeInfo = [];

        SectionVars = Response.split("\x1d");
        if (SectionVars.length >= 4){
          ScopeType         = parseInt(SectionVars[0]);
          ImageIndex        = parseInt(SectionVars[1]);
          AbsoluteStation   = parseInt(SectionVars[2]);
          ScopeInfo         = SectionVars[3].split("\x1E");
        }

        if ((ImageIndex >= 0) && (ImageIndex < MaxImagesPerPage)){
          if (WriteScopeDataSmall(paper[ImageIndex],ScopeInfo,ImageColor,ScopeType) == true){
            var RefreshTimeout = setTimeout("RemoveRefresh("+ImageIndex+")",400);
            if (ScopeType == 1){
              WriteScopeInfoSmallTypeError(ImageIndex,ScopeInfo,AbsoluteStation);
            }
            else {
            	WriteScopeInfoSmallTypeOther(ImageIndex,ScopeInfo);
            }
          }
        }
        onTimeoutImage();
      }
    }
  }
}

//-----------

function UpdateImageData()
{
  if (ImageDataTimeout > 0){
    ImageDataTimeout--;
    return;
  }

  if (xmlhttpImageData != null){
    xmlhttpImageData.abort();
  }

  if (StationsOnThisPage == 0) return;

  var AbsoluteStation = (CurrentPageIndex*MaxImagesPerPage)+CurrentUpdateIndex;
  var ScopeCardIndex = GetSelectBoxValue('scopecard_index',-1);
  var ScopeTypeIndex = GetGlobalVar("ScopeType",2); // default is last

  if (ScopeCardIndex >= 0){

    var ReturnParams   = "return="+ScopeTypeIndex+"+"+CurrentUpdateIndex+"+"+AbsoluteStation;
    var DataParams     = "data=smallscope"+":"+ScopeCardIndex+":"+AbsoluteStation+":"+ScopeTypeIndex;
    var TotalParams    = ReturnParams + "&" + DataParams;

    xmlhttpImageData = loadXMLDocASynch("data_srv.cgi", TotalParams, onStateChangeImage, onTimeoutImage);

    ImageDataTimeout = 10;
    if (StationsOnThisPage > 0){
      CurrentUpdateIndex = (CurrentUpdateIndex + 1) % StationsOnThisPage;
    }
  }
}

//-----------

function GetIdentNrText(IdentNrValue)
{
  var IdentText = IdentNrValue;
  if (parseInt(IdentNrValue,16) == 0) IdentText = "-";
  return IdentText;
}

//-----------

function GetModelnameText(ModelName)
{
  if (ModelName.length == 0) return "-";
  return ModelName;
}

//-----------

function GetMasterSlaveTextPB(StationInfo)
{
  var Result = [];
  if (StationInfo & 1) Result.push("Device");
  if (StationInfo & 2) Result.push("Controller");
  var TextResult = Result.join(" & ");
  if (TextResult.length > 0) TextResult = " (" + TextResult + ")";
  return TextResult;
}

//-----------

function GetMasterSlaveTextFF(StationInfo)
{
  var Result = [];
  if (StationInfo & 0x0002) Result.push("LAS");
  if (StationInfo & 0x0001) Result.push("Basic device");
  if (StationInfo & 0x0400) Result.push("Temp. device");
  var TextResult = Result.join(" & ");
  if (TextResult.length > 0) TextResult = " (" + TextResult + ")";
  return TextResult;
}

//-----------

function GetDeviceAddressPB(Address)
{
  Address = parseInt(Address);
  if (Address == 127) return "스코프 리피터";
  return Address;
}

//-----------

function GetDeviceAddressFF(Address)
{
  Address = parseInt(Address);
  return Address;
}

//-----------

function WriteScopeInfoSmallTypeOther(ImageIndex,ScopeInfoArray)
{
  var TableId = "SmallImage" + ImageIndex;

  var Class_Livelist = "";
  var Text_Address   = "";
  var Text_Timestamp = "";
  var Text_IdentNr   = "";
  var Text_Model     = "";
  var Text_Lost      = "";
  var Text_Repeats   = "";
  var Text_Illegals  = "";
  var Text_Tagname   = "";

  if (ScopeInfoArray != undefined){
    var ScopeType = parseInt(ScopeInfoArray[9]);
    
    if ((ScopeType == 1) || (ScopeType == 2)){
      if (ScopeInfoArray.length >= 17){
        var Obj = document.getElementById(TableId);
        if (Obj != null){
          Obj.DeviceAddress = ScopeInfoArray[3];
        }

        Class_Livelist = GetLivelistBackgroundColor(ScopeInfoArray[15]);
        if (Class_Livelist.length == 0) Class_Livelist = " LiveListDataCell-Invalid";
        Text_Address   = GetDeviceAddressPB(ScopeInfoArray[3]) + GetMasterSlaveTextPB(ScopeInfoArray[15]);
        Text_Timestamp = ScopeInfoArray[6];
        Text_IdentNr   = GetIdentNrText(ScopeInfoArray[10]);
        Text_Model     = GetModelnameText(ScopeInfoArray[11]);
        Text_Lost      = GetStatisticsValueText(ScopeInfoArray[12]);
        Text_Repeats   = GetStatisticsValueText(ScopeInfoArray[13]);
        Text_Illegals  = GetStatisticsValueText(ScopeInfoArray[14]);
        Text_Tagname   = ScopeInfoArray[16];
      }
    }
    if (ScopeType == 3){
      if (ScopeInfoArray.length >= 10){
        var Obj = document.getElementById(TableId);
        if (Obj != null){
          Obj.DeviceAddress = ScopeInfoArray[3];
        }

        Class_Livelist = GetFFLivelistBackgroundColor(ScopeInfoArray[10]);
        if (Class_Livelist.length == 0) Class_Livelist = " LiveListDataCell-Invalid";
        Text_Address   = GetDeviceAddressFF(ScopeInfoArray[3]) + GetMasterSlaveTextFF(ScopeInfoArray[10]);
        Text_Timestamp = ScopeInfoArray[6];

        Text_IdentNr   = "-";
        Text_Model     = "-";
        Text_Lost      = "-";
        Text_Repeats   = "-";
        Text_Illegals  = "-";
        Text_Tagname   = "-";
      }
    }
  }

  SetClass(TableId+"_Livelist",Class_Livelist);
  SetInnerHtmlValue(TableId+"_Address"   ,Text_Address);
  SetInnerHtmlValue(TableId+"_Timestamp" ,Text_Timestamp);
  SetInnerHtmlValue(TableId+"_Tagname"   ,Text_Tagname);
  SetInnerHtmlValue(TableId+"_IdentNr"   ,Text_IdentNr);
  SetInnerHtmlValue(TableId+"_Model"     ,Text_Model);
  SetInnerHtmlValue(TableId+"_Lost"      ,Text_Lost);
  SetInnerHtmlValue(TableId+"_Repeats"   ,Text_Repeats);
  SetInnerHtmlValue(TableId+"_Illegals"  ,Text_Illegals);
}

//-----------

function WriteScopeInfoSmallTypeError(ImageIndex,ScopeInfoArray,AbsoluteStation)
{
  var TableId = "SmallImage" + ImageIndex;

  var Text_Timestamp = "";
  var Text_DeleteImage = "<input type='button' value='삭제' onclick='DeleteImage("+AbsoluteStation+")'>";
  var Text_ErrorType = "알수없음";

  if (ScopeInfoArray != undefined){
    if (ScopeInfoArray.length >= 7){
      var Obj = document.getElementById(TableId);
      if (Obj != null){
        Obj.ErrorIndex = AbsoluteStation;
      }
      Text_Timestamp = ScopeInfoArray[6];
      Text_ErrorType = GetScopeErrorText(ScopeInfoArray[5]);
    }
  }

  SetInnerHtmlValue(TableId+"_Timestamp" ,Text_Timestamp);
  SetInnerHtmlValue(TableId+"_DeleteImage" ,Text_DeleteImage);
  SetInnerHtmlValue(TableId+"_ErrorType",Text_ErrorType);
}

//-----------

function ClearScopeInfoSmall(ImageIndex)
{
	var TableId = "SmallImage" + ImageIndex;
	
	// if type is normal image (las/min/max) clear these items:
  SetClass(TableId+"_Livelist","");
  SetInnerHtmlValue(TableId+"_Address"   ,"");
  SetInnerHtmlValue(TableId+"_Timestamp" ,"");
  SetInnerHtmlValue(TableId+"_Tagname"   ,"");
  SetInnerHtmlValue(TableId+"_IdentNr"   ,"");
  SetInnerHtmlValue(TableId+"_Model"     ,"");
  SetInnerHtmlValue(TableId+"_Lost"      ,"");
  SetInnerHtmlValue(TableId+"_Repeats"   ,"");
  SetInnerHtmlValue(TableId+"_Illegals"  ,"");
  
  // if its a scope error image clear these items:
  SetInnerHtmlValue(TableId+"_Timestamp" ,"");
  SetInnerHtmlValue(TableId+"_DeleteImage" ,"");
  SetInnerHtmlValue(TableId+"_ErrorType","");
}

//-----------

function ScopecardSelectBoxChange()
{
  UpdateSelectedPage(0);

  var ScopeCardIndex = GetSelectBoxValue('scopecard_index',-1);
  SetGlobalVar("CardIndex",ScopeCardIndex);

  var ScopeTypeIndex = GetSelectBoxValue('scopetype_index',2);
  SetGlobalVar("ScopeType",ScopeTypeIndex);

  InvalidateAllImages(ScopeTypeIndex);
  CurrentUpdateIndex = 0;
}

//-----------

function ScopetypeSelectBoxChange()
{
  UpdateSelectedPage(-1);

  var ScopeTypeIndex = GetSelectBoxValue('scopetype_index',2);
  SetGlobalVar("ScopeType",ScopeTypeIndex);

  InvalidateAllImages(ScopeTypeIndex);
  CurrentUpdateIndex = 0;
  
  while(TableIds.length > 0){
    var ImgIndex = (TableIds.length-1);
    DynamicRemoveTable(TableIds.pop(),ImgIndex);
  }
  StationsTotal = 0;
}

//-----------

function InvalidateImage(ImgNumber,AllowedType)
{
  InvalidateScopeDataSmall(paper[ImgNumber],"이미지 갱신중...",AllowedType);
  ClearScopeInfoSmall(ImgNumber);
}

//-----------

function InvalidateAllImages(AllowedType)
{
  for(var i=0; i<TableIds.length; i++){
    InvalidateImage(i,AllowedType);
  }
}

//-----------

function ScopeImageClick(table_id)
{
	var ScopeTypeIndex = GetSelectBoxValue('scopetype_index',2);
  var Obj = document.getElementById(table_id);
  if (Obj == null) return;

  var ScopeCardIndex = GetSelectBoxValue('scopecard_index',-1);
  SetGlobalVar("CardIndex",ScopeCardIndex);
	
	if (ScopeTypeIndex == 1){ // error image type
	  var ErrorImgIndex = parseInt(Obj.ErrorIndex);
	  if (isNaN(ErrorImgIndex)) return;
	
	  SetGlobalVar("ErrorIndex",ErrorImgIndex);
	  NavigateTo("mon_scope_e.htm");
	}
	else { // other image type
	  var Address = parseInt(Obj.DeviceAddress);
	  if (isNaN(Address)) return;
	
	  SetGlobalVar("StationAddress",Address);
	  NavigateTo("mon_scope.htm");
	}
}

//-----------

function ResetScope()
{
  var ScopeTypeIndex = GetSelectBoxValue('scopetype_index',0);
  InvalidateAllImages(ScopeTypeIndex);
  CurrentUpdateIndex = 0;

  var ScopeCardIndex = GetSelectBoxValue('scopecard_index',-1);
  var Params = "action=ResetScope:"+ScopeCardIndex+"+ResetScopeErrors:"+ScopeCardIndex;
  xmlhttpAction = loadXMLDocASynch("data_srv.cgi", Params, onStateChangeAction, onTimeoutAction);  
}

//-----------

function onTimeoutAction()
{
  xmlhttpAction.onreadystatechange = function() {}
  xmlhttpAction.abort();
}

//-----------

function onStateChangeAction()
{
  if (xmlhttpAction != null){
    if (xmlhttpAction.readyState == 4){
      if (xmlhttpAction.status == 200){
        var Response = decodeURIComponent(xmlhttpAction.responseText);
        /* no action taken */
        onTimeoutAction();
      }
    }
  }
}

//-----------

function RemoveRefresh(ImageIndex)
{
  RemoveRefreshIconSmall(paper[ImageIndex]);
}

//-----------

function RefreshErrorScope()
{
  var ScopeCardIndex = GetSelectBoxValue('scopecard_index',-1);
  xmlhttpAction = loadXMLDocASynch("data_srv.cgi", "action=RefreshScopeErrors:"+ScopeCardIndex, onStateChangeAction, onTimeoutAction);

  InvalidateAllImages(1);
}

//-----------

function DeleteImage(ImageIndex)
{
  var ScopeCardIndex = GetSelectBoxValue('scopecard_index',-1);
  xmlhttpAction = loadXMLDocASynch("data_srv.cgi", "action=DeleteScopeErrorImage:"+ScopeCardIndex+":"+ImageIndex, onStateChangeAction, onTimeoutAction);

  InvalidateAllImages(1);
}

//-----------
