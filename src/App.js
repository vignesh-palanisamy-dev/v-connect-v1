import React, { useEffect, useState } from "react";
import { Button, Input } from "antd";
import { useHistory } from "react-router-dom";
import { LoginOutlined, PhoneOutlined } from "@ant-design/icons";
import { NEW_CALL } from "./constant";
import "./App.css";

function App() {
  const history = useHistory();
  const [callCode, setCallCode] = useState("");

  useEffect(() => {}, []);

  const handleJoinClick = () => {
    if (callCode.length > 0) {
      history.push(`/call/${callCode}`);
    }
  };

  const handleNewCallClick = () => history.push(`/call/${NEW_CALL}`);

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
            onClick={handleNewCallClick}
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
              onClick={handleJoinClick}
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
