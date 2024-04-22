//const express = require('express')
import express from 'express'

const app = express()
//const { MongoClient } = require('mongodb')
import {MongoClient} from 'mongodb'
const port=5000
app.use(express.json())
import * as dotenv from 'dotenv'
dotenv.config()
console.log(process.env.mongo_url)
//mongodb connection
const mongo_url =process.env.mongo_url;
async function main() {
    // Use connect method to connect to the server
    const client=new MongoClient(mongo_url)
    await client.connect();
    console.log('Connected successfully to server');
    return client
}
const client=await main()


app.get('/', function (req, res) {
  res.send('Mentor and Student Assigning with Database')
})

//get method(mentor)
app.get('/mentor/', async  (req, res)=> {
  
        const facility=await client.db("stud-mentor").collection("mentor").find().toArray()
        /* const facility=await client.db("hallbooking").collection("facility").find({}).toArray() */
        console.log(facility)
      res.send(facility)
      })

      //post method(mentor)

      app.post('/mentor', async (req, res) => {
        try {
            const { mentor_id } = req.body;
      
            // Check if there's any document with the same mentor_id
            const existingmentor_id = await client.db("stud-mentor").collection("mentor").findOne({ mentor_id });
            if (existingmentor_id) {
                // If data already exists with the same mentor_id, send a response indicating the conflict
                return res.status(400).send('Data with the same mentor_id already exists');
            }
         // If data doesn't exist with the same mentor_id, insert it into the collection
            await client.db("stud-mentor").collection("mentor").insertOne(req.body);
            res.status(201).send('Data inserted successfully');
        } catch (error) {
            console.error('Error:', error);
            res.status(500).send('Internal Server Error');
        }
      });

//get method(student)

app.get('/student/', async  (req, res)=> {
/*    const{student_id}=req.query
  
    if(req.query.student_id){
      req.query.student_id=+req.query.student_id
    }
    if(req.query.room_id){
      req.query.id=+req.query.room_id
    } */
    const facility=await client.db("stud-mentor").collection("student").find().toArray()
    /* const facility=await client.db("hallbooking").collection("facility").find({}).toArray() */
    console.log(facility)
  res.send(facility)
  })
  
  //get single student Id
  app.get('/student/:student_id', async  (req, res)=> {
    const{student_id}=req.params
    console.log(req.params,student_id)
    const facility=await client.db("stud-mentor").collection("student").findOne({student_id:+student_id})
    console.log(facility)
  
    facility?res.send(facility):res.send({message:"There is no such that student"})
  })

  //posting students
  app.post('/student', async (req, res) => {
    try {
        const { student_id } = req.body;
  
        // Check if there's any document with the same date
        const existingstudent_id = await client.db("stud-mentor").collection("student").findOne({ student_id });
        if (existingstudent_id) {
            // If data already exists with the same date, send a response indicating the conflict
            return res.status(400).send('Data with the same student_id already exists');
        }
     // If data doesn't exist with the same date and student_id, insert it into the collection
        await client.db("stud-mentor").collection("student").insertOne(req.body);
        res.status(201).send('Data inserted successfully');
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Internal Server Error');
    }
  });
  


// Endpoint to assign a student to a mentor
app.post('/assign-mentor/:mentor_id/:student_id', async (req, res) => {
  try {
      const { mentor_id, student_id } = req.params;

      // Check if the mentor and student exist
      const mentor = await client.db("stud-mentor").collection("mentor").findOne({ mentor_id: +mentor_id });
      const student = await client.db("stud-mentor").collection("student").findOne({ student_id: +student_id });

      if (!mentor || !student) {
          return res.status(404).send('Mentor or student not found');
      }

      // Check if the student is already assigned to a mentor
      if (student.mentor_id) {
          return res.status(400).send('Student is already assigned to a mentor');
      }

      // Update the student document with the mentor's ID
      await client.db("stud-mentor").collection("student").updateOne(
          { student_id: +student_id },
          { $set: { mentor_id: +mentor_id } }
      );

      res.status(200).send('Student assigned to mentor successfully');
  } catch (error) {
      console.error('Error:', error);
      res.status(500).send('Internal Server Error');
  }
});

// Endpoint to get student details including assigned mentor
app.get('/student-details/:student_id', async (req, res) => {
  try {
      const { student_id } = req.params;

      // Find the student and their assigned mentor
      const studentDetails = await client.db("stud-mentor").collection("student").aggregate([
          {
              $match: { student_id: +student_id }
          },
          {
              $lookup: {
                  from: "mentor",
                  localField: "mentor_id",
                  foreignField: "mentor_id",
                  as: "assigned_mentor"
              }
          },
          {
              $unwind: "$assigned_mentor"
          },
          {
              $project: {
                  _id: 0, // Exclude _id field from the result
                  student_id: 1,
                  student_name: 1,
                  mentor_id: "$assigned_mentor.mentor_id",
                  mentor_name: "$assigned_mentor.mentor_name"
              }
          }
      ]).toArray();

      if (studentDetails.length === 0) {
          return res.status(404).send('Student not found');
      }

      res.status(200).send(studentDetails[0]); // Assuming there's only one student with the given ID
  } catch (error) {
      console.error('Error:', error);
      res.status(500).send('Internal Server Error');
  }
});

// Endpoint to assign or change mentor for a student
app.put('/assign-mentor/:student_id/:mentor_id', async (req, res) => {
  try {
      const { student_id, mentor_id } = req.params;

      // Check if the student and mentor exist
      const student = await client.db("stud-mentor").collection("student").findOne({ student_id: +student_id });
      const mentor = await client.db("stud-mentor").collection("mentor").findOne({ mentor_id: +mentor_id });

      if (!student || !mentor) {
          return res.status(404).send('Student or mentor not found');
      }

      // Update the student document with the new mentor's ID
      await client.db("stud-mentor").collection("student").updateOne(
          { student_id: +student_id },
          { $set: { mentor_id: +mentor_id } }
      );

      res.status(200).send('Mentor assigned or changed successfully');
  } catch (error) {
      console.error('Error:', error);
      res.status(500).send('Internal Server Error');
  }
});

// Endpoint to get all students for a particular mentor
app.get('/mentor-students/:mentor_id', async (req, res) => {
  try {
      const { mentor_id } = req.params;

      // Find all students assigned to the specified mentor
      const mentorStudents = await client.db("stud-mentor").collection("student").find({ mentor_id: +mentor_id }).toArray();

      res.status(200).send(mentorStudents);
  } catch (error) {
      console.error('Error:', error);
      res.status(500).send('Internal Server Error');
  }
});

// Endpoint to get previously assigned mentor for a student
app.get('/previous-mentor/:student_id', async (req, res) => {
  try {
      const { student_id } = req.params;

      // Find the student and check if they have a previous mentor
      const student = await client.db("stud-mentor").collection("student").findOne({ student_id: +student_id });
      if (!student) {
          return res.status(404).send('Student not found');
      }

      if (student.previous_mentor_id) {
          // Find the details of the previous mentor
          const previousMentor = await client.db("stud-mentor").collection("mentor").findOne({ mentor_id: student.previous_mentor_id });
          if (!previousMentor) {
              return res.status(404).send('Previous mentor not found');
          }

          res.status(200).send(previousMentor);
      } else {
          res.status(404).send('No previous mentor assigned to this student');
      }
  } catch (error) {
      console.error('Error:', error);
      res.status(500).send('Internal Server Error');
  }
});

app.listen(port,()=>console.log("server started on port:",port))
