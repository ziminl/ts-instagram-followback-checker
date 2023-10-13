package main

import (
    "fmt"
    "io/ioutil"
    "net/http"
    "net/url"
    "strings"
    "time"
)

const (
    InstagramURL = "https://www.instagram.com/graphql/query/?"
)

type Script struct {
    CheckVerifiedUsers bool
    Unfollowers        []Unfollower
    CanQuery           bool
    NextPageHash       string
    RequestsCount      int
    FollowingCount     int
    CurrentPageCount   int
    EstimatedStepValue int
    Cookies            string
}

type Unfollower struct {
    Username   string
    IsVerified bool
}

func (s *Script) getCookie(cookieName string) (string, error) {
    cookies := strings.Split(s.Cookies, ";")
    for _, cookie := range cookies {
        parts := strings.Split(strings.TrimSpace(cookie), "=")
        if len(parts) == 2 && parts[0] == cookieName {
            return parts[1], nil
        }
    }
    return "", fmt.Errorf("Cookie not found!")
}

func (s *Script) createURLParamsString(params url.Values) string {
    return params.Encode()
}

func (s *Script) generateURL() (string, error) {
    id, err := s.getCookie("ds_user_id")
    if err != nil {
        return "", err
    }
    params := url.Values{
        "query_hash": {"3dec7e2c57367ef3da3d987d89f9dbc8"},
        "variables":  {fmt.Sprintf(`{"id": "%s", "first": "1000", %s}`,
            id, func() string {
                if s.NextPageHash != "" {
                    return fmt.Sprintf(`"after": "%s"`, s.NextPageHash)
                }
                return ""
            }(),
        )},
    }
    return InstagramURL + s.createURLParamsString(params), nil
}

func (s *Script) startScript() {
    for s.CanQuery {
        if s.RequestsCount != 0 && s.RequestsCount%5 == 0 {
            handleOutput("RATE_LIMIT", nil)
            time.Sleep(15 * time.Second)
        }

        url, err := s.generateURL()
        if err != nil {
            fmt.Printf("Error generating URL: %v\n", err)
            return
        }

        res, err := http.Get(url)
        if err != nil {
            fmt.Printf("Error fetching data: %v\n", err)
            return
        }
        defer res.Body.Close()

        data, err := ioutil.ReadAll(res.Body)
        if err != nil {
            fmt.Printf("Error reading response: %v\n", err)
            return
        }


        s.RequestsCount++
        s.FollowingCount += 1000 
        s.CurrentPageCount += 1000 

        if s.EstimatedStepValue == 0 {
            s.EstimatedStepValue = 1000 
        }

        handleOutput("PROGRESS", map[string]interface{}{
            "currentPageCount":   s.CurrentPageCount,
            "estimatedStepValue": s.EstimatedStepValue,
            "followingCount":     s.FollowingCount,
        })

        time.Sleep(3 * time.Second)
    }

    handleOutput("FINISH", map[string]interface{}{
        "unfollowers": s.Unfollowers,
    })
}

func handleOutput(outputType string, data map[string]interface{}) {
    switch outputType {
    case "PROGRESS":
        fmt.Printf("Execution in progress! %d out of %d completed (%d%%) - Estimated time: %s\n",
            data["currentPageCount"].(int), data["followingCount"].(int),
            int((float64(data["currentPageCount"].(int))/float64(data["followingCount"].(int)))*100),
            getMinutes(data["currentPageCount"].(int), data["followingCount"].(int), s.EstimatedStepValue))
    case "RATE_LIMIT":
        fmt.Println("RATE LIMIT. Trying again in 15 seconds.")
    case "FINISH":
        unfollowers := data["unfollowers"].([]Unfollower)
        if len(unfollowers) == 0 {
            fmt.Println("All people follow you back.")
        } else {
            fmt.Printf("%d people do not follow you back:\n", len(unfollowers))
            for _, unfollower := range unfollowers {
                fmt.Printf("%s%s - https://www.instagram.com/%s/\n", unfollower.Username, func() string {
                    if unfollower.IsVerified {
                        return "!"
                    }
                    return ""
                }(), unfollower.Username)
            }
        }
    }
}

func getMinutes(currentPageCount, followingCount, estimatedStepValue int) string {
    steps := (followingCount - currentPageCount) / estimatedStepValue
    seconds := steps*3 + (steps/5)*15
    minutes := seconds / 60
    if minutes <= 1 {
        return "Less than 1 minute"
    }
    return fmt.Sprintf("%d minutes", minutes)
}

func main() {
    cookies := "your_cookie_string_here"
    script := Script{
        CheckVerifiedUsers: true,
        Cookies:            cookies,
    }
    script.startScript()
}
