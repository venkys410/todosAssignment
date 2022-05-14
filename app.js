const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const format = require("date-fns/format");
const isValid = require("date-fns/isValid");

const databasePath = path.join(__dirname, "todoApplication.db");

const app = express();

app.use(express.json());

let database = null;

const initializeDbAndServer = async () => {
  try {
    database = await open({
      filename: databasePath,
      driver: sqlite3.Database,
    });

    app.listen(3000, () =>
      console.log("Server Running at http://localhost:3000/")
    );
  } catch (error) {
    console.log(`DB Error: ${error.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();

const hasPriorityAndStatusProperties = (requestQuery) => {
  return (
    requestQuery.priority !== undefined && requestQuery.status !== undefined
  );
};

const hasPriorityAndCategoryProperties = (requestQuery) => {
  return (
    requestQuery.priority !== undefined && requestQuery.category !== undefined
  );
};

const hasCategoryAndStatusProperties = (requestQuery) => {
  return (
    requestQuery.category !== undefined && requestQuery.status !== undefined
  );
};

const hasPriorityProperty = (requestQuery) => {
  return requestQuery.priority !== undefined;
};

const hasStatusProperty = (requestQuery) => {
  return requestQuery.status !== undefined;
};
const hasCategoryProperty = (requestQuery) => {
  return requestQuery.category !== undefined;
};

const convertDbToResponse = (dbObject) => {
  return {
    id: dbObject.id,
    todo: dbObject.todo,
    priority: dbObject.priority,
    status: dbObject.status,
    category: dbObject.category,
    dueDate: dbObject.due_date,
  };
};

app.get("/todos/", async (request, response) => {
  let data = null;
  let getTodosQuery = "";
  const { search_q = "", priority, status, category } = request.query;

  switch (true) {
    case hasPriorityAndStatusProperties(request.query):
      getTodosQuery = `
      SELECT
        *
      FROM
        todo 
      WHERE
        todo LIKE '%${search_q}%'
        AND status = '${status}'
        AND priority = '${priority}';`;
      break;
    case hasPriorityAndCategoryProperties(request.query):
      getTodosQuery = `
      SELECT
        *
      FROM
        todo 
      WHERE
        todo LIKE '%${search_q}%'
        AND priority = '${priority}'
        AND category = '${category}';`;
      break;
    case hasCategoryAndStatusProperties(request.query):
      getTodosQuery = `
      SELECT
        *
      FROM
        todo 
      WHERE
        todo LIKE '%${search_q}%'
        AND status = '${status}'
        AND category = '${category}';`;
      break;
    case hasPriorityProperty(request.query):
      getTodosQuery = `
      SELECT
        *
      FROM
        todo 
      WHERE
        todo LIKE '%${search_q}%'
        AND priority = '${priority}';`;
      break;
    case hasStatusProperty(request.query):
      getTodosQuery = `
      SELECT
        *
      FROM
        todo 
      WHERE
        todo LIKE '%${search_q}%'
        AND status = '${status}';`;
      break;
    case hasCategoryProperty(request.query):
      getTodosQuery = `
      SELECT
        *
      FROM
        todo 
      WHERE
        todo LIKE '%${search_q}%'
        AND category = '${category}';`;
      break;
    default:
      getTodosQuery = `
      SELECT
        *
      FROM
        todo 
      WHERE
        todo LIKE '%${search_q}%';`;
  }
  //console.log(getTodosQuery);
  data = await database.all(getTodosQuery);
  const formattedData = data.map((eachTodo) => convertDbToResponse(eachTodo));
  response.send(formattedData);
});

//API 2

app.get("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const getTodoQuery = `
    SELECT
      *
    FROM
      todo
    WHERE
      id = ${todoId};`;
  const todo = await database.get(getTodoQuery);
  console.log(todo);
  const formattedTodo = convertDbToResponse(todo);
  response.send(formattedTodo);
});

//API 3
app.get("/agenda/", async (request, response) => {
  const { date } = request.query;
  //console.log(date);
  //const formatedDate = format(new Date(date), "yyyy-MM-dd");
  //console.log(formatedDate);
  const isDateValid = isValid(new Date(date));
  //console.log(isDateValid);
  if (isDateValid) {
    const formatedDate = format(new Date(date), "yyyy-MM-dd");
    const getAgendaQuery = `SELECT * FROM todo WHERE due_date = "${formatedDate}";`;
    const todosArray = await database.all(getAgendaQuery);
    const formattedArray = todosArray.map((eachTodo) =>
      convertDbToResponse(eachTodo)
    );
    response.send(formattedArray);
  } else {
    response.status(400);
    response.send("Invalid Due Date");
  }
});

//API 4

app.post("/todos/", async (request, response) => {
  const { id, todo, priority, status, category, dueDate } = request.body;
  const formatedDueDate = format(new Date(dueDate), "yyyy-MM-dd");
  const postTodoQuery = `
  INSERT INTO
    todo (id, todo, priority, status,category,due_date)
  VALUES
    (${id}, '${todo}', '${priority}', '${status}','${category}','${formatedDueDate}');`;
  await database.run(postTodoQuery);
  response.send("Todo Successfully Added");
});

//API 5
app.put("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  let updateColumn = "";
  const requestBody = request.body;
  switch (true) {
    case requestBody.status !== undefined:
      updateColumn = "Status";
      break;
    case requestBody.priority !== undefined:
      updateColumn = "Priority";
      break;
    case requestBody.todo !== undefined:
      updateColumn = "Todo";
      break;
    case requestBody.category !== undefined:
      updateColumn = "Category";
      break;
    case requestBody.dueDate !== undefined:
      updateColumn = "Due Date";
      break;
  }
  const previousTodoQuery = `
    SELECT
      *
    FROM
      todo
    WHERE 
      id = ${todoId};`;
  const previousTodo = await database.get(previousTodoQuery);

  const {
    todo = previousTodo.todo,
    priority = previousTodo.priority,
    status = previousTodo.status,
    category = previousTodo.category,
    dueDate = previousTodo.due_date,
  } = request.body;
  let formatedUpdatedDate = format(dueDate, "yyyy-MM-dd");
  const updateTodoQuery = `
    UPDATE
      todo
    SET
      todo='${todo}',
      priority='${priority}',
      status='${status}',
      category = '${category}',
      due_date ='${formatedUpdatedDate}'
    WHERE
      id = ${todoId};`;
  if (
    updateColumn === "Status" &&
    (requestBody.status === "To Do" ||
      requestBody.status === "IN PROGRESS" ||
      requestBody.status === "Done")
  ) {
    await database.run(updateTodoQuery);
    response.send(`${updateColumn} Updated`);
  } else {
    response.status(400);
    response.send("Invalid Todo Status");
  }
  if (
    updateColumn === "Priority" &&
    (requestBody.priority === "HIGH" ||
      requestBody.priority === "MEDIUM" ||
      requestBody.priority === "LOW")
  ) {
    await database.run(updateTodoQuery);
    response.send(`${updateColumn} Updated`);
  } else {
    response.status(400);
    response.send("Invalid Todo Priority");
  }
  if (
    updateColumn === "Priority" &&
    (requestBody.priority === "HIGH" ||
      requestBody.priority === "MEDIUM" ||
      requestBody.priority === "LOW")
  ) {
    await database.run(updateTodoQuery);
    response.send(`${updateColumn} Updated`);
  } else {
    response.status(400);
    response.send("Invalid Todo Priority");
  }
  if (
    updateColumn === "Category" &&
    (requestBody.category === "WORK" ||
      requestBody.category === "HOME" ||
      requestBody.category === "LEARNING")
  ) {
    await database.run(updateTodoQuery);
    response.send(`${updateColumn} Updated`);
  } else {
    response.status(400);
    response.send("Invalid Todo Category");
  }
  if (updateColumn === "Todo") {
    await database.run(updateTodoQuery);
    response.send(`${updateColumn} Updated`);
  }
  const isGivenDateValid = isValid(new Date(requestBody.dueDate));
  if (updateColumn === "Due Date" && isGivenDateValid) {
    await database.run(updateTodoQuery);
    response.send(`${updateColumn} Updated`);
  } else {
    response.status(400);
    response.send("Invalid Due Date");
  }
});

//API 6

app.delete("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const deleteTodoQuery = `
  DELETE FROM
    todo
  WHERE
    id = ${todoId};`;

  await database.run(deleteTodoQuery);
  response.send("Todo Deleted");
});

module.exports = app;
