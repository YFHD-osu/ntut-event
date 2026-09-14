import csv
import random
import json

def show_people(d: list):
    for i in sorted(d, key= lambda e: f"{e['班級']} {e['學號']}"):
        print(f"{i['班級']} {i['學號']} {i['姓名']}")

def is_underclassmen(row: dict):
    # 班級
    if row['班級'] == "資工一":
        return True
    
    # 轉學生
    if str(row['學號']).startswith("11459045"):
        return True
    
    return False

def cvrt_dict_entry_to_row(dict: dict[str, list[dict]]):
    # Put title header in buffer initially
    buffer = [['時間戳記', '班級','姓名','學號','Instagram','Line','其他聯繫方式', '分組']]
    for k, v in dict.items():
        buffer += [list(r.values()) + [k] for r in v]

    return buffer

def main():
    with open('input.csv', newline='') as csvfile:
        reader = csv.DictReader(csvfile)
        data = [i for i in reader]
    
    result = {}

    underclassmen = [d for d in data if is_underclassmen(d)]
    upperclassmen = [d for d in data if not is_underclassmen(d)]

    orphan_upperclassmen = []
    orphan_underclassmen = []
    
    # Fill result dict with pair (tail_number, [underclassmen])
    for f in underclassmen:
        tail_number = f['學號'][-2:]
        result[tail_number] = [ f ]

    # Find underclassmen for each upperclassmen
    for o in upperclassmen:
        tail_number = o['學號'][-2:]

        if tail_number in result.keys():
            result[tail_number].append(o)
            continue
        
        # Upperclassmen who didn't find thier underclassmen become orphan
        orphan_upperclassmen.append(o)
    
    pending_del_key = []
    for k, v in result.items():
        if len(v) != 1: continue
        
        # Move orphan underclassmen form the result
        orphan_underclassmen.append(v[0])
        pending_del_key.append(k)

    for k in pending_del_key:
        del result[k]

    # Start random matching the 
    random.shuffle(orphan_upperclassmen)
    random.shuffle(orphan_underclassmen)
    
    max_random_set = min(len(orphan_upperclassmen), len(orphan_underclassmen))
    for i in range(max_random_set):
        result[f"rand{i}"] = [orphan_upperclassmen[i], orphan_underclassmen[i]]
    
    orphan_upperclassmen = orphan_upperclassmen[max_random_set:]
    orphan_underclassmen = orphan_underclassmen[max_random_set:]
    
    # More upperclassmen need to be handle
    if len(orphan_upperclassmen) != 0:
        print("這些學長是孤兒了：")
        show_people(orphan_upperclassmen)
        result['orphan'] = orphan_upperclassmen
        return
    
    print("這些學弟是孤兒了：")
    show_people(orphan_underclassmen)
    result['orphan'] = orphan_underclassmen

    res = cvrt_dict_entry_to_row(result)
    print(res)
    
    with open("output.csv", mode="w", newline="", encoding="utf-8") as file:
        writer = csv.writer(file)
        
        # 使用 writerows 一次寫入所有列
        writer.writerows(res)
        
if __name__ == "__main__":
    main()