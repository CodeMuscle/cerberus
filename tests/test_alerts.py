from cerberus.alerts import CHANNEL, arm, build_alert


def test_build_alert_targets_token_baseline_for_the_service():
    a = build_alert("my-agent", token_baseline=1500)
    assert a["alertType"] == "TRACES_BASED_ALERT"
    spec = a["condition"]["compositeQuery"]["queries"][0]["spec"]
    assert spec["aggregations"][0]["expression"] == "max(gen_ai.usage.input_tokens)"
    assert spec["filter"]["expression"] == "service.name = 'my-agent'"
    thr = a["condition"]["thresholds"]["spec"][0]
    assert thr["target"] == 1500 and thr["channels"] == [CHANNEL]


def test_arm_creates_channel_and_alert_when_absent():
    calls = []

    def caller(name, args):
        calls.append(name)
        return '{"data": []}'  # nothing exists yet

    out = arm("svc", caller=caller)
    assert out["created"] is True
    assert "signoz_create_notification_channel" in calls
    assert "signoz_create_alert" in calls


def test_arm_is_idempotent_when_both_exist():
    def caller(name, args):
        if name == "signoz_list_notification_channels":
            return '{"data": [{"name": "cerberus-webhook"}]}'
        if name == "signoz_list_alert_rules":
            return '{"data": [{"alert": "Cerberus — prompt token spike (svc)"}]}'
        raise AssertionError(f"should not write: {name}")

    out = arm("svc", caller=caller)
    assert out["created"] is False
