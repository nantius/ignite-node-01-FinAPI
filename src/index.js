const { response } = require("express");
const express = require("express");
const { v4: uuidv4 } = require("uuid");

const app = express();
app.use(express.json());

const customers = [];

// Middleware
function verifyIfExistsAccountCPF(req, res, next) {
    const { cpf } = req.headers;

    const customer = customers.find(customer => customer.cpf === cpf);

    if (!customer) {
        return res.status(404).json({ error: "Customer not found." });
    }

    req.customer = customer;

    return next();
}

/**
 * Returns balance from given statement
 * 
 * @param {array} statement 
 * @returns {number}
 */
function getBalance(statement) {
    return statement.reduce((acc, operation) => {
        if (operation.type === 'credit') {
            return acc + operation.amount;
        } else {
            return acc - operation.amount;
        }
    }, 0);
}


/**
 * Creates an account
 * 
 * @param {string} CPF - identifies the user
 * @param {string} name - identifies the user
 * @returns {null}
 */
app.post("/account", (req, res) => {
    const { cpf, name } = req.body;

    const customerAlreadyExists = customers.some(
        (customer) => customer.cpf === cpf
    );

    if (customerAlreadyExists) {
        return res.status(400).json({ error: "Customer already exists!" });
    }

    customers.push({
        cpf,
        name,
        id: uuidv4(),
        statement: []
    });

    return res.status(201).send();
});


/**
 * Returns the statement from an existing account
 * 
 * @param {string} CPF - identifies the user
 * @returns {statement}
 */
app.get("/statement", verifyIfExistsAccountCPF, (req, res) => {
    return res.json(req.customer.statement);
});

/**
 * Returns the statement from an existing account based on date input
 * 
 * @param {string} CPF - identifies the user
 * @param {date} date - date from which the user wants to see statements
 * @returns {statement}
 */
app.get("/statement/date", verifyIfExistsAccountCPF, (req, res) => {
    const { customer } = req;
    const { date } = req.query;

    const dateFormat = new Date(date + " 00:00");

    const statement = customer.statement.filter(
        (statement) => statement.created_at.toDateString() === new Date(dateFormat).toDateString()
    );

    return res.json(statement);
});

/**
 * Deposits an amount into a valid account
 * 
 * @param {string} description - explains the reason for the deposit
 * @param {number} amount - quantity for the deposit
 * @returns {null}
 */
app.post("/deposit", verifyIfExistsAccountCPF, (req, res) => {
    const { description, amount } = req.body;
    const { customer } = req;

    const statementOperation = {
        description,
        amount,
        created_at: new Date(),
        type: "credit"
    };

    customer.statement.push(statementOperation);

    return res.status(201).send();
});

/**
 * Withdraws an amount from a valid account that has a positive balance
 * 
 * @param {string} CPF - identifies the user
 * @param {string} description - explains the reason for the deposit
 * @param {number} amount - quantity for the deposit
 * @returns {null}
 */
app.post("/withdraw", verifyIfExistsAccountCPF, (req, res) => {
    const { amount } = req.body;
    const { customer } = req;

    const balance = getBalance(customer.statement);

    if (balance < amount) {
        return res.status(400).json({ error: "Insufficient funds!" });
    }

    const statementOperation = {
        amount,
        created_at: new Date(),
        type: "debit"
    };

    customer.statement.push(statementOperation);

    return res.status(201).send();
});

/**
 * Updates account info
 * 
 * @param {string} CPF - identifies the user
 * @param {string} name - Account owner/name
 * @returns {null}
 */
app.put("/account", verifyIfExistsAccountCPF, (req, res) => {
    const { name } = req.body;
    const { customer } = req;

    customer.name = name;

    return res.status(201).send();
});

/**
 * Returns account info
 * 
 * @param {string} CPF - identifies the user
 * @returns {null}
 */
app.get("/account", verifyIfExistsAccountCPF, (req, res) => {
    const { customer } = req;

    return res.json(customer);

});


/**
 * Deletes an account as long as it exists
 * 
 * @param {string} CPF - identifies the user
 * @returns {customer[]}
 */
app.delete("/account", verifyIfExistsAccountCPF, (req, res) => {
    const { customer } = req;

    const customerIndex = customers.findIndex(c => c.cpf === customer.cpf);
    customers.splice(customerIndex, 1);

    return res.status(200).json(customers);
});

/**
 * Returns existing account's balance
 * 
 * @param {string} CPF - identifies the user
 * @returns {statement}
 */
app.get("/balance", verifyIfExistsAccountCPF, (req, res) => {
    const { customer } = req;

    const balance = getBalance(customer.statement);

    return res.json(balance);
})




app.listen(3333);