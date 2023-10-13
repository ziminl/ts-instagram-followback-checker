import time
import requests

def sleep(milliseconds):
    time.sleep(milliseconds / 1000)

def handle_output(type, data):
    
    def get_minutes():
        steps = (data['followingCount'] - data['currentPageCount']) // data['estimatedStepValue']
        seconds = steps * 3 + (steps // 5) * 15
        minutes = seconds // 60
        return "1분내" if minutes <= 1 else f"{minutes} 분"
    
    if type == "PROGRESS":
        print(f"%c실행중! {data['currentPageCount']} 개 중 {data['followingCount']} 개 완료 ({int((data['currentPageCount'] / data['followingCount']) * 100)}%) - 예정시간: {get_minutes()}")
    elif type == "RATE_LIMIT":
        print("%cRATE LIMIT. 15초 후에 다시 실행합니다.")
    elif type == "FINISH":
        if len(data['unfollowers']) == 0:
            print("%c모든사람이 님 맞팔로우함.")
        else:
            print(f"%c {len(data['unfollowers'])} 명이 맞팔하지 않습니다.")
            for unfollower in data['unfollowers']:
                print(f"{unfollower['username']}{'!' if unfollower['isVerified'] else ''} - https://www.instagram.com/{unfollower['username']}/")

class Script:
    def __init__(self, check_verified_users, cookies):
        self.check_verified_users = check_verified_users
        self.unfollowers = []
        self.can_query = True
        self.next_page_hash = ""
        self.requests_count = 0
        self.following_count = 0
        self.current_page_count = 0
        self.estimated_step_value = 0
        self.cookies = cookies

    def get_cookie(self, cookie_name):
        for cookie in self.cookies.split(";"):
            key, value = map(str.strip, cookie.split("="))
            if key == cookie_name:
                return requests.utils.unquote(value)
        raise Exception("Cookie not found!")

    def create_url_params_string(self, params):
        return "&".join([f"{key}={value}" for key, value in params.items()])

    async def generate_url(self):
        id = self.get_cookie("ds_user_id")
        params = {
            "query_hash": "3dec7e2c57367ef3da3d987d89f9dbc8",
            "variables": json.dumps({"id": id, "first": "1000", **({"after": self.next_page_hash} if self.next_page_hash else {})})
        }
        return f"https://www.instagram.com/graphql/query/?{self.create_url_params_string(params)}"

    async def start_script(self):
        try:
            while self.can_query:
                if self.requests_count != 0 and self.requests_count % 5 == 0:
                    handle_output("RATE_LIMIT")
                    sleep(15000)
                
                url = await self.generate_url()
                response = requests.get(url)
                data = response.json()

                for edge in data["data"]["user"]["edge_follow"]["edges"]:
                    if not edge["node"]["follows_viewer"] and (not self.check_verified_users or not edge["node"]["is_verified"]):
                        self.unfollowers.append({
                            "username": edge["node"]["username"],
                            "isVerified": edge["node"]["is_verified"]
                        })

                self.can_query = data["data"]["user"]["edge_follow"]["page_info"]["has_next_page"]
                self.next_page_hash = data["data"]["user"]["edge_follow"]["page_info"]["end_cursor"]
                self.requests_count += 1
                self.following_count = data["data"]["user"]["edge_follow"]["count"]
                self.current_page_count += len(data["data"]["user"]["edge_follow"]["edges"])

                if self.estimated_step_value == 0:
                    self.estimated_step_value = len(data["data"]["user"]["edge_follow"]["edges"])

                handle_output("PROGRESS", {
                    "currentPageCount": self.current_page_count,
                    "estimatedStepValue": self.estimated_step_value,
                    "followingCount": self.following_count
                })

                sleep(3000)

            handle_output("FINISH", {
                "unfollowers": self.unfollowers
            })
        except Exception as error:
            print(f"Something went wrong!\n{error}")

cookies = 'your_cookie_string_here'
Script(True, cookies).start_script()
