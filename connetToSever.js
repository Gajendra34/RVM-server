import * as dotenv from 'dotenv'
import mysql2 from 'mysql2'
dotenv.config();


const connection = ()=>{
    const db=mysql2.createConnection(process.env.DATABASE_URL)
    console.log('Connected to PlanetScale!')
    // db.end()
}
export default connection;