import React,{propTypes} from 'react';
import api from '../dhis2API';
import constants from '../constants';
import ReactHTMLTableToExcel from 'react-html-table-to-excel';


export function ApprovalTable(props){
    
    var instance = Object.create(React.Component.prototype);
    instance.props = props;
    
    var state = {
        user : props.user,
        usergroup1 : props.usergroup1,
        usergroup2 : props.usergroup2,
        program : props.program,
        events : props.events,
        sdate : props.sdate,
        edate:props.edate,
        teiWiseAttrVals : props.teiWiseAttrVals,
        selectedSpeciality : props.selectedSpeciality,
        seletedUserGroup: props.seletedUserGroup,
        ous : props.ous,
        type : props.type,
        callMeWhenInPain : props.callMeWhenInPain,
        userAuthority : props.userAuthority
    };

    var programStageMap = state.program.programStages.reduce(function(map,obj){
        map[obj.id] = obj;
        return map;
    },[]);
    
    var programStageOptionSetOptionsMap = state.program.programStages.reduce(function(map,obj){
        
        var optionSetMap = obj.programStageDataElements.reduce(function(map,obj){
            
            if (obj.dataElement.optionSet){
                map[obj.dataElement.id] = [];
                var options = obj.dataElement.optionSet.options;
                for (var i=0; i< options.length;i++){
                    map[obj.dataElement.id][options[i].code] = options[i].name;
                }
            }
            
            return map;
        },[]);
        
        map[obj.id] = optionSetMap;
        return map;
    },[]);
    //var count = 1;
    var teiAttrValMap = {};
    state.teiWiseAttrVals.reduce(function(map,tei){

        return tei.attrs.reduce(function(map,obj){
                teiAttrValMap[tei.tei+obj.attr]= obj.value;
                //console.log(tei.tei+obj.attr + " : "+obj.value);
            return map;
        },[]);
    },[]);

    var dataList = [];
    //console.log(state.seletedUserGroup);
    state.dataO = state.events.reduce(function(list,event){
        var nameObj = teiAttrValMap[event.trackedEntityInstance+"T6eQvMXe3MO"];
        if((state.selectedSpeciality === 'Kd8DRRvZDro' && state.seletedUserGroup == 'all') || (state.selectedSpeciality === 'Bm7Bc9Bnqoh' && state.seletedUserGroup == 'all')){
            dataList.push(event);
        }
        else if(state.selectedSpeciality === 'Kd8DRRvZDro' || state.selectedSpeciality === 'Bm7Bc9Bnqoh'){
            if(state.seletedUserGroup === state.usergroup1.id) {
                state.usergroup1.users.forEach(function (user) {
                    if(nameObj === user.userCredentials.username){
                        dataList.push(event);
                    }
                });
            }
            else if(state.seletedUserGroup === state.usergroup2.id) {
                state.usergroup2.users.forEach(function (user) {
                    if(nameObj === user.userCredentials.username){
                        dataList.push(event);
                    }
                });
            }
        }
        else{
            dataList.push(event);
        }
        return dataList;
    },[]);

    var ouMap = state.ous.reduce(function(map,obj){
        map[obj.id] = obj;
        return map;
    },[]);
    
    var selectedStage = programStageMap[state.selectedSpeciality];
    
    instance.render = render;
    return instance;


    function approveRecord(eventuid,programuid,e){

        if (confirm("Are You Sure You want to Approve this record")) {

            var approveDeVal = state.userAuthority==constants.approval_usergroup_level1_code?constants.approval_status.approved:constants.approval_status.approved;
            //        approveDeVal="Pending1";
            saveDV(eventuid,programuid,
                constants.approval_status_de,
                approveDeVal,
                constants.approval_rejection_reason_de,
                "",
                "COMPLETED",
                state.callMeWhenInPain);
        } else {

        }

    }

    function saveDV(eventuid,programuid,
                    approvalDe,
                    approvalDeVal,
                    rejectionDe,
                    rejectionDeVal,
                    status,callback){
        
        var apiWrapper = new api.wrapper();
        var url = `events/${eventuid}/${approvalDe}`;
        var obj = {
            dataValues : [
                {dataElement : approvalDe,
                 value:approvalDeVal}
            ],
            program : programuid,
            status :status
        }
        apiWrapper.updateObj(url,obj,function(error,body,response){
            if (error){
                alert("An unexpected error occurred." + error);
                return;
            }

            var url = `events/${eventuid}/${rejectionDe}`;
            var obj = {
                dataValues : [
                    {dataElement : rejectionDe,
                     value:rejectionDeVal}
                ],
                program:programuid,
                status :status
            }


            apiWrapper.updateObj(url,obj,function(error,body,response){
                if (error){
                    alert("An unexpected error occurred." + error);
                    return;
                }
                
                callback();            
            })
            
        })
    }
    
    function rejectRecord(eventuid,programuid,e){
        var reason = prompt("Please enter reason for rejection", "");
        if(reason.length > 160)
        {alert("User can enter 160 characters only"); return;}
        if (!reason){return}
        if (confirm("Are You Sure You want to Reject this record")) {
            saveDV(eventuid, programuid,
                constants.approval_status_de,
                constants.approval_status.rejected,
                constants.approval_rejection_reason_de,
                reason,
                "ACTIVE",
                state.callMeWhenInPain);

        }
        else{

        }
    }
    
    function getHeader(){
        var list = [];
        list.push(<th className="approval_normal" key="h_eventdate">Event Date</th>);
        list.push(<th className="approval_normal" key="h_name of specilist">Name of Specialist</th>);
        list.push(<th className="approval_wide"  key="h_ou">Org Unit</th>);
        
        selectedStage.
            programStageDataElements.
            reduce(function(list,obj){
            //console.log(obj.dataElement);
            if(obj.dataElement.id === "qgzoi2gteWu" || obj.dataElement.id === "ZnzjYCK4r9w"){
            }
            else {
                list.push(<th className={obj.valueType != "TEXT" ? "approval_nonText" : ""}
                              key={obj.id}>{obj.dataElement.formName}</th>)
            }
                return list;
            },list);
        if(state.type == constants.report_types.pending) {
            list.push(<th className="approval_normal" key="h_operation">Approved/ Rejected </th>);
        }
        return list;
    }

    function getRows(){

        return state.dataO.reduce(function(list,event){

            var eventDVMap = event.dataValues.reduce(function(map,obj){

                map[obj.dataElement] = obj.value;

                if (programStageOptionSetOptionsMap[event.programStage]){
                    if (programStageOptionSetOptionsMap[event.programStage][obj.dataElement]){
                        if (programStageOptionSetOptionsMap[event.programStage][obj.dataElement][obj.value]){
                            map[obj.dataElement]= programStageOptionSetOptionsMap[event.programStage][obj.dataElement][obj.value];
                        }
                    }
                }

                return map;                
            },[]);

            var _list = [];
            _list.push(<td className="approval_normal" key="d_eventdate">{event.eventDate?event.eventDate.substring(0,10):""}</td>);
            _list.push(<td className="approval_normal" key="d_name of specilist">{teiAttrValMap[event.trackedEntityInstance+"U0jQjrOkFjR"]}</td>);
            _list.push(<td className="approval_wide" key="d_ou">{makeFacilityStrBelowLevel(ouMap[event.orgUnit],2)}</td>);
            //var statusList = [];
            selectedStage.
                programStageDataElements.
                reduce(function(_list,obj){
                if(obj.dataElement.id === "qgzoi2gteWu" || obj.dataElement.id === "ZnzjYCK4r9w"){
                }
                else {
                    if(obj.dataElement.id === 'W3RxC0UOsGY')
                    {
                        _list.push(<td className={obj.valueType != "TEXT" ? "approval_nonText" : ""}
                                       key={"d" + obj.id + event.event}>{eventDVMap[obj.dataElement.id]?eventDVMap[obj.dataElement.id]:'Need to Send'}</td>)
                    }
                    else{
                        _list.push(<td className={obj.valueType != "TEXT" ? "approval_nonText" : ""}
                                       key={"d" + obj.id + event.event}>{eventDVMap[obj.dataElement.id]}</td>)
                    }
                }
                return _list;
                },_list);
            if(state.type == constants.report_types.pending) {
                _list.push(getButtons(event.event, event.program))
            }
            list.push([<tr key={event.event}>{_list}</tr>]);

            return list;
        },[]);


        function getButtons(eventuid,programuid){
            return ( <td className="approval_normal" key={"b_"+eventuid}><div className="approvalOperationDiv">
                <input hidden={state.type == constants.report_types.pending ?false:true} className= "approvalButton" type="button" value="Approve" onClick={approveRecord.bind(null,eventuid,programuid)}></input>
                <input hidden={state.type == constants.report_types.pending ?false:true} className= "approvalButton" type="button" value="Reject" onClick={rejectRecord.bind(null,eventuid,programuid)}></input>
            </div></td>)
        }
    }
    
    function makeFacilityStrBelowLevel(ou,level){        
        return ou.ancestors.reduce(function(str,obj){
            if(obj.level>level){
                str = str + obj.name + " / " ;
            }
            return str;
        },"")  + ou.name;                
    }
    
    function render(){
        
        return ( 
                <div>
                    <ReactHTMLTableToExcel
                        id="test-table-xls-button"
                        className="btn"
                        table="table-to-xls"
                        filename={"DD_Approval_"+selectedStage.name+"_"+state.sdate+"-"+state.edate}
                        sheet="1"
                        buttonText="Download"/><br/><br/>

                <h5> Record List </h5>

                <table className="approvalTable">
                
            </table>

                <table className="approvalTable" id="table-to-xls">
                <thead>
                <tr>
                <th colSpan="3">Attributes</th>
                <th colSpan={  selectedStage.programStageDataElements.length+1}>{selectedStage.name}</th>
                </tr>
                <tr>
                {getHeader()}
            </tr>
                </thead>

                <tbody>
                
            {getRows()}
            </tbody>
                </table>
                
            
            
            
            </div>
        )
    }
    
}

