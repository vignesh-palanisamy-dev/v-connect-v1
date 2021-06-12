import React, { useEffect, useState } from "react";
import { Button, Input, Row, Tag } from "antd";
import { useHistory } from "react-router-dom";
import {
  PlusCircleOutlined,
  LoginOutlined,
  PhoneOutlined,
  EnterOutlined,
} from "@ant-design/icons";
import "./App.css";

function App() {
  const history = useHistory();
  const [userId] = useState(`${new Date().getTime()}`);
  const [callCode, setCallCode] = useState("");

  useEffect(() => {}, []);

  const handleClick = () => history.push("/call");

  const onInputChange = (event) => setCallCode(event.target.value);

  return (
    <div className="app-container">
      <div className="container">
        <div className="header">
          <label>V-Connect</label>
        </div>
        <div className="content">
          <Button
            className="new-call-btn"
            type="primary"
            size="large"
            icon={<PhoneOutlined />}
            onClick={handleClick}
          >
            NEW CALL
          </Button>
          <label className="or-label">OR</label>
          <div className="join-container">
            <Input
              size="large"
              placeholder="ENTER CODE"
              prefix={<LoginOutlined />}
              onChange={onInputChange}
            />
            <Button
              className="enter-call-btn"
              type="primary"
              size="large"
              onClick={handleClick}
              // disabled={!callCode.length > 0}
            >
              JOIN
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
