[
  [
    "- 이 로직 필요없음? 이미 그림 끝나면 해당 백터 데이터 공간에 맞게 1대 1 매핑해서 저장돼고 있나\n- 우리는 content에 저장된 SVG 텍스트를 그대로 넘겨줍니다. LLM(대규모 언어 모델)은 코드를 읽는 데 특화되어 있기 때문에",
    " SVG 코드를 읽어서 그림의 의도를 분석하고 답변을 줄 수 있습니다.\nsvg 저장 돼는 db 알려줘 필드 보게  "
  ]
]

import { $broker } from '@modules/kernel/logic/kzm_shell_broker';
import { $log } from '@modules/kernel/logic/kzm_kernel_logger';
import { Kzm } from '@modules/memo/core/kzm_memo_entities';


