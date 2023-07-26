import express, { json } from 'express'
import mysql2 from 'mysql2'
import dotenv from 'dotenv'
import bcrypt from 'bcrypt'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import jwt from 'jsonwebtoken'
import multer from 'multer'
import path from 'path'

// import db from './connetToSever.js'


const app = express();
app.use(express.json());
app.use(cookieParser());
dotenv.config();
app.use(express.static('public'));  // for image access

app.use("*",cors({
    origin:true,
    credentials:true,
    methods:["GET","POST","PUT","DELETE"]
}),
function(req,res,next)
{
    req.header('Access-Control-Allow-Origin',req.origin),
    req.header('Access-Control-Allow-Headers',"Origin,X-Requested-With,Content-Type")
    next()
})

const salt = 10;

const db=mysql2.createConnection(process.env.DATABASE_URL)

app.use(cors({
    origin: ['https://rvmserver.onrender.com','http://localhost:3000'],
    method: ["POST", "GET", "DELETE"],
    credentials: true
}))

const upload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, 'public/images')
        },
        filename: (req, file, cb) => {
            cb(null, file.fieldname + "_" + Date.now() + path.extname(file.originalname));
        }
    })
});




const verifyUser = (req, res, next) => {
    const token = req.cookies.token;
    if (!token) {
        return res.json({ Error: "Yor are not Authenticated" })
    }
    else {
        jwt.verify(token, "jwt-secret-key", (err, decoded) => {
            if (err) return res.json({ Error: "Token wrong" })
            req.role = decoded.role;
            req.image = decoded.image;
            req.firstname = decoded.firstname;
            next();
        })
    }
}

app.get('/', verifyUser, (req, res) => {
    return res.json({ Status: "Success", role: req.role, image: req.image, firstname: req.firstname })
})


app.post('/signup', upload.single('image'), (req, res) => {
    const sql = 'INSERT INTO users1(`firstname`,`lastname`,`email`,`password`,`image`) VALUES(?,?,?,?,?)'
    bcrypt.hash(req.body.password.toString(), salt, (err, hash) => {
        if (err) return res.json({ Error: "Error for hashing password" })
    })

    if (req.body.firstname.length == 0 || req.body.lastname.length == 0 || req.body.email.length == 0 || req.body.password.length == 0) {
        return res.json({ Error: "Plaese Enter a Data" })
    }

    // if (req.file.filename.length == 0) {
    //     return res.json({ Error: "Please upload a image" })
    // }

    db.query(sql, [req.body.firstname, req.body.lastname, req.body.email, req.body.password, req.file.filename], (err, result, field) => {
        if (err) return res.json({ Error: "Inserting data Error in server " });
        return res.json({ Status: "Success" })
    })
})


app.post('/login', (req, res) => {
    const sql = 'SELECT * FROM users1 WHERE email=?'
    db.query(sql, [req.body.email], async (err, result) => {
        if (err) return res.json({ Status: "Error", Error: "Error in running query" })
        if (result.length > 0) {
            const newHashedPassword = await bcrypt.hash(req.body.password.toString(), salt)
            await bcrypt.compare(result[0].password, newHashedPassword, async (err, resp) => {
                if (err) return res.json({ Error: "Password compare error" });
                if (resp) {
                    // const id = result[0].id;
                    const token = jwt.sign({ role: "customer", image: result[0].image, firstname: result[0].firstname }, "jwt-secret-key", { expiresIn: '1d' });
                    res.cookie('token', token,{
                        sameSite:'none',
                        secure:true,
                        httpOnly:true
                    });
                    return res.json({ Status: "Success" });
                }
                else {
                    return res.json({ Error: "Password not matched" });
                }
            })
        }
        else {
            return res.json({ Status: "Error", Error: "Wrong Email and Password" })
        }
    })
})




app.get('/logout', (req, res) => {
    res.cookie('token', null,{
        sameSite:'none',
        secure:true,
        httpOnly:true
    });
    return res.json({ Status: "Success" })
})

app.post('/add_product', upload.single('image'), (req, res) => {
    const sql = 'INSERT INTO addproduct(`com_name`,`about`,`price`,`image`) VALUES(?,?,?,?)'
    if (req.body.com_name.length == 0 || req.body.about.length == 0 || req.body.price.length == 0) {
        return res.json({ Error: "Plaese Enter a Data" })
    }
    db.query(sql, [req.body.com_name, req.body.about, req.body.price, req.file.filename], (err, result) => {
        if (err) return res.json({ Error: "Inserting data Error in server " });
        return res.json({ Status: "Success" })
    })
})

app.get('/getproduct', (req, res) => {
    const sql = 'SELECT * FROM addproduct';
    db.query(sql, (err, result) => {
        if (err) return res.json({ Error: "Get product error in sql" })
        return res.json({ Status: "Success", Result: result })
    })
})

app.get('/addproduct_page', verifyUser, (req, res) => {
    return res.json({ Status: "Success", role: req.role })
})

app.get('/all_cate', (req, res) => {
    const sql = 'SELECT COUNT(DISTINCT com_name) AS cate FROM addproduct';
    db.query(sql, (err, result) => {
        if (err) return res.json({ Error: "Total category error in sql" })
        return res.json(result)
    })
})

app.get('/all_item', (req, res) => {
    const sql = 'SELECT COUNT(product_id) AS item FROM addproduct';
    db.query(sql, (err, result) => {
        if (err) return res.json({ Error: "Total item error in sql" })
        return res.json(result)
    })
})

app.get('/all_user', (req, res) => {
    const sql = 'SELECT COUNT(id) AS user FROM users1';
    db.query(sql, (err, result) => {
        if (err) return res.json({ Error: "Total user error in sql" })
        return res.json(result)
    })
})

app.post('/atc/:id', (req, res) => {
    const id = req.params.id;
    const sql = "INSERT INTO addtocart(com_name,about,price,image) SELECT com_name,about,price,image FROM addproduct WHERE product_id=?"
    db.query(sql, [id], (err, result) => {
        // console.log(id)
        if (err) return res.json({ Error: "Total user error in sql" })
        return res.json({ Status: "Success" })
    })
})

app.get('/addtocart', (req, res) => {
    const sql = 'SELECT * FROM addtocart';
    db.query(sql, (err, result) => {
        if (err) return res.json({ Error: "Get product error in sql" })
        return res.json({ Status: "Success", Result: result })
    })
})


app.delete('/pro_delete_atc/:id', (req, res) => {
    const id = req.params.id;
    const sql = "DELETE FROM addtocart WHERE product_id=?"
    db.query(sql, [id], (err, result) => {
        if (err) return res.json({ Error: "Delete product in addTocart error in sql" })
        return res.json({ Status: "Success" })
    })
})

app.get('/tot_pro_atc', (req, res) => {
    const sql = 'SELECT COUNT(product_id) AS tot_pro FROM addtocart';
    db.query(sql, (err, result) => {
        if (err) return res.json({ Error: "Total product error in sql" })
        return res.json(result)
    })
})

app.get('/tot_price_atc', (req, res) => {
    const sql = 'SELECT SUM(price) AS tot_price FROM addtocart';
    db.query(sql, (err, result) => {
        if (err) return res.json({ Error: "Total user error in sql" })
        return res.json(result)
    })
})

app.delete('/pro_delete/:id', (req, res) => {
    const id = req.params.id;
    const sql = "DELETE FROM addproduct WHERE product_id=?"
    db.query(sql, [id], (err, result) => {
        if (err) return res.json({ Error: "Delete product error in sql" })
        return res.json({ Status: "Success" })
    })
})








import nodemailer from 'nodemailer'
import { error } from 'console'
var transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    requireTLS: true,
    sedrvice: 'gmail',
    auth: {
        user: 'u21cs035@coed.svnit.ac.in',
        pass: 'NIT05-08-2001'
    }
})

app.post('/checkout', (req, res) => {
    var mailOption = {
        from: 'u21cs035@coed.svnit.ac.in',
        to: req.body.email,
        subject: 'rVm Collection',
        text: 'Thank You! Your Order Placed Successfully...'
    }
    const sql = 'INSERT INTO checkout (`firstname`,`lastname`,`phone`,`email`,`address`,`city`,`state`,`country`,`zip_code`) VALUES(?,?,?,?,?,?,?,?,?)';
    if (req.body.firstname.length == 0 || req.body.lastname.length == 0 || req.body.phone.length == 0 || req.body.email.length == 0 || req.body.address.length == 0 || req.body.city.length == 0 || req.body.state.length == 0 || req.body.country.length == 0 || req.body.zip_code.length == 0) {
        return res.json({ Error: "Plaese Enter a Data" })
    }
    db.query(sql, [req.body.firstname, req.body.lastname, req.body.phone, req.body.email, req.body.address, req.body.city, req.body.state, req.body.country, req.body.zip_code], (err, result) => {
        if (err) return res.json({ Error: "Inserting data Error in server " });
        transporter.sendMail(mailOption, (err, info) => {
            if (err) return res.json({ Error: "msg send Error in server " });
            // console.log('successfull', info.response)
            return res.json({ Status: "Success" })

        })
    })
})

app.post('/contact', (req, res) => {
    var mailOption = {
        from: 'u21cs035@coed.svnit.ac.in',
        to: req.body.email,
        subject: req.body.subject,
        text: req.body.message
    }
    if (req.body.name.length == 0 || req.body.email.length == 0 || req.body.subject.length == 0 || req.body.message.length == 0) {
        return res.json({ Error: "Plaese Enter a Data" })
    }
    transporter.sendMail(mailOption, (err, info) => {
        if (err) return res.json({ Error: "msg send Error in server " });
        // console.log('successfull', info.response)
        return res.json({ Status: "Success" })

    })
})


app.post('/forgotpassword', (req, res) => {
    const sql = 'SELECT email,password FROM users1 WHERE email=?'
    if (req.body.email.length == 0) {
        return res.json({ Error: "Plaese Enter a Data" })
    }
    db.query(sql, [req.body.email], (err, result) => {
        if (!err) {
            if (result.length <= 0) {
                return res.json({ Error: "Please Enter Correct Email Address" })
            }
            else {
                var mailOption = {
                    from: 'u21cs035@coed.svnit.ac.in',
                    to: result[0].email,
                    subject: 'Password By rVm Shopping System',
                    html: '<p><b>Your Login details For rVm Shopping System</b><br/><b>Email: </b>' + result[0].email + '<br/><b>Password: <b/>' + result[0].password + '<br/><a href="http://localhost:3000/login">Click here to login</a></p>'
                };
                transporter.sendMail(mailOption, (err, info) => {
                    if (err) return res.json({ Error: "msg send Error in server " });
                    // console.log('successfull', info.response)
                    return res.json({ Status: "Success" })

                })
            }
        }
        else {
            return res.json({ Error: 'Error in Running query' })
        }
    })
})




app.get('/genbill', (req, res) => {
    const sql = 'SELECT * FROM checkout ORDER BY id DESC LIMIT 1;'
    db.query(sql, (err, result) => {
        if (err) return res.json({ Error: "Get product error in sql" })
        return res.json({ Status: "Success", Result: result })
    })
})

app.get('/del_atc_item', (req, res) => {
    const sql = 'TRUNCATE TABLE addtocart'
    db.query(sql, (err, result) => {
        if (err) return res.json({ Error: "Get product error in sql" })
        return res.json({ Status: "Success" })
    })
})











app.listen(process.env.PORT, () => {
    console.log(`Server is listening on http://localhost:${process.env.PORT}`)
    // db();
    
})


