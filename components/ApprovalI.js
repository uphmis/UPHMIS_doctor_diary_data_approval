import React,{propTypes} from 'react';
import api from '../dhis2API';
import {ApprovalTable} from './ApprovalTable';
import constants from '../constants';
import moment from 'moment';

export function ApprovalI(props){
    
    var instance = Object.create(React.Component.prototype);
    instance.props = props;

    var bbGroup = false;
  
    var state = {

        program : props.data.program,
        user : props.data.user,
        usergroup1: props.data.usergroup1,
        usergroup2:props.data.usergroup2,
        selectedOU : props.data.user.organisationUnits[0],
        orgUnitValidation : "",
        specialityValidation : "",
        userValidation : "",
        ouMode : "DESCENDANTS",
        sdate : moment().subtract(1,'months').startOf('month').format("YYYY-MM-DD"),
        edate : moment().subtract(1,'months').endOf('month').format("YYYY-MM-DD"),
        selectedSpeciality : "-1",
        seletedUserGroup : "-1",
        events : null,
        teiWiseAttrVals : null,
        ous : [],
        type : constants.report_types.pending,
        userAuthority : getUserAuthority(props.data.user)
    };
      
    props.services.ouSelectCallback.selected = function(ou){

        state.selectedOU = ou;
        state.orgUnitValidation = ""
        instance.setState(state);
    }
    
    instance.render = render;
    return instance;

    function onSpecialityChange(e){
        state.selectedSpeciality = e.target.value;
        if(state.selectedSpeciality === 'Kd8DRRvZDro' || state.selectedSpeciality === 'Bm7Bc9Bnqoh')
        {
            bbGroup = true;
        }
        else{
            bbGroup = false;
            state.seletedUserGroup = "-1";
        }
        state.specialityValidation = ""

        instance.setState(state);
    }
    function onGroupChange(e){
        state.seletedUserGroup = e.target.value;
        state.userValidation = "";

        instance.setState(state);
    }

    function onOuModeChange(e){
        state.ouMode = e.target.value;
        instance.setState(state);
    }

    function onStartDateChange(e){
        state.sdate = e.target.value;
        instance.setState(state);
    }

    function onEndDateChange(e){
        state.edate = e.target.value;
        if ((Date.parse(state.sdate) > Date.parse(state.edate))) {
            alert("End date should be greater than Start date");
        }
        else{
            instance.setState(state);
        }

    }

    function onTypeChange(e){
        state.type = e.target.value;
        instance.setState(state);
        
    }

    function callMeWhenInPain(){
        getApprovalEvents();
    }

    function validate(){
        if (state.selectedOU.id == undefined){
            state.orgUnitValidation = "Please select Facility form left bar"
            instance.setState(state);
            return false;
        }

        if (state.selectedSpeciality == "-1"){
            state.specialityValidation = "Please select Speciality"
            instance.setState(state);
            return false;
        }
        if ((Date.parse(state.sdate) > Date.parse(state.edate))) {
            alert("End date should be greater than Start date");
            return false;
        }
        if((state.selectedSpeciality === 'Kd8DRRvZDro' && state.seletedUserGroup == '-1') || (state.selectedSpeciality === 'Bm7Bc9Bnqoh' && state.seletedUserGroup == '-1'))
        {
            state.userValidation = "Please select Buddy Buddy Group"
            instance.setState(state);
            return false;
        }
        
        return true;
    }

    
    function getApprovalEvents(e){

        // validation
        if (!validate()){
            return;
        }
        
        state.teiWiseAttrVals = null;
        state.events = null;
        state.loading=true;
        instance.setState(state);

        
     
        fetchEventGrid(function(eventuids){
            if (!eventuids){
                alert("No Data Found");
                state.loading=false;
                instance.setState(state);
                return
            }
            fetchEvents(eventuids)

        });
        
        
        function fetchEvents(eventuids){
            
            var url = `events?paging=false&order=eventDate:desc&event=${eventuids}&org=`+state.selectedOU;

            var apiWrapper = new api.wrapper();
            apiWrapper.getObj(url,function(error,body,response){
                if (error){
                    alert("An unexpected error occurred." + error);
                    return;
                }

                var events = response.events;
                state.events = events;

                getTEIFromEvents(events,function(error,body,response){
                    if (error){

                    }

                    var attrVals = JSON.parse(response.
                                              listGrid.
                                              rows[0][0]?response.
                                              listGrid.
                                              rows[0][0].value:null);
                    
                    state.teiWiseAttrVals = attrVals;

                    getOuFromEvent(events,function(error,response,body){
                        if (error){
                            
                        }
                        
                        state.ous = body.organisationUnits;
                        state.loading=false;
                        instance.setState(state)
                    })
                    
                })
                
            })

        }
        
        function fetchEventGrid(callback){
            var url = `events/query?program=${constants.program_doc_diary}&startDate=${state.sdate}&endDate=${state.edate}&orgUnit=${state.selectedOU.id}&ouMode=${state.ouMode}&programStage=${state.selectedSpeciality}&skipPaging=true`;

            switch(state.type){
            case constants.report_types.typeall:
                url = `${url}&filter=${constants.approval_status_de}`
                break;
            case constants.report_types.approved :
                url = `${url}&status=COMPLETED&filter=${constants.approval_status_de}:IN:${constants.approval_status.approved};${constants.approval_status.autoapproved}`
                break;
            case constants.report_types.pending:
                if (state.userAuthority == constants.approval_usergroup_level1_code){
                    url = `${url}&status=COMPLETED&filter=${constants.approval_status_de}:IN:${constants.approval_status.pending1};${constants.approval_status.resubmitted}`
                    
                }else{
                    url = `${url}&status=COMPLETED&filter=${constants.approval_status_de}:IN:${constants.approval_status.pending2}`                
                }
                
                break;
            case constants.report_types.rejected:
                url = `${url}&status=ACTIVE&filter=${constants.approval_status_de}:IN:${constants.approval_status.rejected}`
                break;                
            }
            
            var apiWrapper = new api.wrapper();
            apiWrapper.getObj(url,function(error,body,response){
                if (error){
                    alert("An unexpected error occurred." + error);
                    return;
                }

                var eventuids = response.rows.reduce(function(str,obj){
                    str = str + obj[0] + ";"
                    return str;
                },"")

                callback(eventuids)
                
            })
        }
        
        function getTEIFromEvents(events,callback){

            var teis = events.reduce(function(list,obj){
                if (!list.includes(obj.trackedEntityInstance)){
                    list.push(obj.trackedEntityInstance)
                }
                return list;
            },[]);

            
            teis = teis.reduce(function(str,obj){
                if (!str){
                    str =  "'" + obj + "'"
                }else{
                    str = str + ",'" + obj + "'"
                }
                
                return str; 
            },null);

            var sqlViewService = new api.sqlViewService();
            
            // console.log(constants.query_teiWiseAttrValue(teis))
            sqlViewService.dip("Approval_App",
                               constants.query_teiWiseAttrValue(teis),
                               callback);
            
        }
        
        function getOuFromEvent(events,callback){
            var ous = events.reduce(function(list,obj){
                if (!list.includes(obj.orgUnit)){
                    list.push(obj.orgUnit)
                }
                return list;
            },[]);

            
            ous = ous.reduce(function(str,obj){
                if (!str){
                    str =  "" + obj + ""
                }else{
                    str = str + "," + obj + ""
                }
                
                return str; 
            },null);

            var apiWrapper = new api.wrapper();
            var url = `organisationUnits.json?filter=id:in:[${ous}]&fields=id,name,ancestors[id,name,level]`;

            apiWrapper.getObj(url,callback)

            
        }
    }

    function getUserAuthority(user){

        return user.userGroups.reduce(function(str,obj){

            if (obj.code == constants.approval_usergroup_level1_code){
                str = constants.approval_usergroup_level1_code;                
            }

            if (obj.code == constants.approval_usergroup_level2_code){
                str = constants.approval_usergroup_level2_code;                
            }
            return str;    
        },null)
        
    }

    function render(){        
        
        function getApprovalTable(){
            if (!state.userAuthority){
                return (<div>You do not have approval authority</div>)
            }
            
            if(!(state.events || state.teiWiseAttrVals)){
                return (<div></div>)
            }        
            
            return (<ApprovalTable key="approvaltable"  events={state.events} program={state.program} user={state.user} teiWiseAttrVals={state.teiWiseAttrVals} selectedSpeciality={state.selectedSpeciality} ous={state.ous} type={state.type} callMeWhenInPain={callMeWhenInPain} userAuthority={state.userAuthority} usergroup1={state.usergroup1} usergroup2={state.usergroup2} seletedUserGroup ={state.seletedUserGroup}/>
                   );
            
        }
        
        function getSpeciality(program){
            
            var options = [
                    <option disabled key="select_speciality" value="-1"> -- Select -- </option>
            ];
            
            program.programStages.forEach(function(ps){
                options.push(<option key = {ps.id}  value={ps.id} >{ps.name}</option>);
            });
            
            return options;
        }
        function getUserGroup(){

            var options = [
                <option disabled key="select_usergroup" value="-1"> -- Select -- </option>
            ];
            options.push(<option key = {state.usergroup1.id}  value={state.usergroup1.id} >{state.usergroup1.name}</option>);
            options.push(<option key = {state.usergroup2.id}  value={state.usergroup2.id} >{state.usergroup2.name}</option>);
            options.push(<option key = "all"  value="all" >Buddy Buddy All</option>);
            return options;
        }
        
        return ( 
                <div>
                <h3> Approval {state.userAuthority==constants.approval_usergroup_level1_code?"MOIC/CMS":"CMO/CMS"} </h3>
                
                <table className="formX">
                <tbody>
                <tr>
                <td>  Select Speciality<span style={{"color":"red"}}> * </span> : </td><td><select  title='User Speciality in Doctor Diary' value={state.selectedSpeciality} onChange={onSpecialityChange} id="report">{getSpeciality(props.data.program)}</select><br></br> <label key="specialityValidation" ><i>{state.specialityValidation}</i></label>
                </td>
                <td className="leftM">  Selected Facility<span style={{"color":"red"}}> * </span>  : </td><td><input disabled  value={state.selectedOU.name} title='Facility Name'></input><br></br><label key="orgUnitValidation" ><i>{state.orgUnitValidation}</i></label></td>
                
            </tr>
                <tr>
                <td> Select Start Period<span style={{"color":"red"}}> * </span>  :  </td><td><input title='Start Date between Date of Selection' type="date" value={state.sdate} onChange = {onStartDateChange} ></input><br></br><label key="startPeValidation" ><i>{}</i></label>
                </td>
                <td className="leftM" > Select End Period<span style={{"color":"red"}}> * </span>  : </td><td><input title='End Date between Date of Selection' type="date" value={state.edate} onChange = {onEndDateChange} ></input><br></br><label key="startPeValidation" ><i>{}</i></label>
                </td>
                <td></td>
                </tr>
                <tr>
                <td className="" > Select OU Mode : </td><td><select  title='Selection Mode of Organisation Unit' value = { state.ouMode  }  id="ouMode" onChange = {onOuModeChange}> <option title="Selected Organisation Unit" key="selected"  value="SELECTED" > Selected </option> <option title="Children of Selected Organisation Unit" key="descendants" value="DESCENDANTS" > Descendants </option> </select></td>

                <td className="leftM" > Select Type : </td><td><select  title='Type of Status (Pending, Approved Or Rejected)' value = { state.type  }  id="type" onChange = {onTypeChange}>
                <option key="rejected"  value={constants.report_types.rejected} > Rejected </option>
                <option key="typeall"  value={constants.report_types.typeall} > ALL </option>
                <option key="application_for_approval"  value={constants.report_types.pending} > Application for Approval </option>
                <option key="approved"  value={constants.report_types.approved} > Approved  </option>
                
            </select></td>
                
                </tr></tbody></table>
                    <table className="formX">
                <tbody>
                <tr className={!bbGroup?'hidden':'show'}>
                    <td>  Select Buddy-Buddy Group<span style={{"color":"red"}}> * </span> : </td>

                    <td ><select value={state.seletedUserGroup} onChange={onGroupChange} id="userGroup"> {getUserGroup()}</select><br></br> <label key="userValidation" ><i>{state.userValidation}</i></label>
                    </td>
                    <td >  </td>
                    <td></td>

                </tr>

                <tr></tr>
                <tr><td>  <input type="submit" value="Submit" onClick={getApprovalEvents} ></input></td>
                <td> <img style = {state.loading?{"display":"inline"} : {"display" : "none"}} src="./images/loader-circle.GIF" alt="loader.." height="32" width="32"></img>  </td></tr>

            </tbody>                
                </table>
                {
                    getApprovalTable()
                }
            
            </div>
        )
    }

}

