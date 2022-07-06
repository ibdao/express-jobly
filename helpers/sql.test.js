"use strict";
const { sqlForPartialUpdate } = require("./sql");

//sqlForPartialUpdate = jest.fn();

describe ("partial update", function (){
    const data = {
        firstName: "Benji",
        lastName: "Mac"
    };
    test ("works", function(){
        let result = sqlForPartialUpdate(
            data, 
            {firstName: "first_name", lastName: "last_name"}
        )
        expect(result).toEqual({
            setCols: '"first_name"=$1, "last_name"=$2', 
            values: ["Benji", "Mac"]
        })
    });
})