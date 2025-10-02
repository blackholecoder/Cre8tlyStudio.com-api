import { createConnection } from "mysql2/promise";
import dotenv from "dotenv";


dotenv.config();

const connect = async () => {
  const connection = await createConnection({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    connectTimeout: 1000000
  });

  connection.connect();
  return connection;
};

export default connect;